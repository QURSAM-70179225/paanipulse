"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bluetooth, BluetoothConnected } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { enqueue, parseHistoryLine, parseReading, PROBE, shouldUpload, toUpload, type UploadReading } from "@/lib/bluetooth/probe";

export interface ProbeLabels {
  title: string; intro: string; connect: string; connecting: string; disconnect: string; connected: string; live: string;
  unsupported: string; uploaded: string; waiting: string; notFound: string; lost: string; prototype: string; history: string;
  notConnected: string; needs: string;
}

/** Minimal Web Bluetooth typings (not in the default TypeScript DOM lib). */
interface BtCharacteristic {
  value?: DataView;
  startNotifications(): Promise<BtCharacteristic>;
  addEventListener(type: "characteristicvaluechanged", cb: (e: Event) => void): void;
  writeValue(v: BufferSource): Promise<void>;
}
interface BtService { getCharacteristic(uuid: string): Promise<BtCharacteristic> }
interface BtServer { getPrimaryService(uuid: string): Promise<BtService>; disconnect(): void }
interface BtDevice { name?: string; id: string; gatt?: { connect(): Promise<BtServer>; connected: boolean; disconnect(): void }; addEventListener(type: "gattserverdisconnected", cb: () => void): void }
interface BtApi { requestDevice(o: { filters: { services: string[] }[] }): Promise<BtDevice> }

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
const decode = (e: Event) => new TextDecoder().decode((e.target as unknown as BtCharacteristic).value);
const qKey = (farmId: string) => `pp_soil_queue_v1_${farmId}`;

function readQueue(farmId: string): UploadReading[] {
  try {
    const q = JSON.parse(localStorage.getItem(qKey(farmId)) ?? "[]");
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}
function writeQueue(farmId: string, q: UploadReading[]) {
  try {
    localStorage.setItem(qKey(farmId), JSON.stringify(q));
  } catch {
    /* storage unavailable: readings stay in memory only */
  }
}

/**
 * Connects to a DIY Bluetooth soil probe from the phone (Web Bluetooth: Chrome on Android) and relays its readings to
 * PaaniPulse. Readings that cannot be sent (no internet) wait in the phone's storage and are sent later.
 */
export function ProbeConnect({ farmId, hasReadings, labels }: { farmId: string; hasReadings: boolean; labels: ProbeLabels }) {
  // With no readings yet the card is shown "dull" (muted, dashed): visible so people know it exists, with the Connect button still usable.
  const router = useRouter();
  const [supported, setSupported] = useState(true);
  const [state, setState] = useState<"idle" | "connecting" | "connected">("idle");
  const [name, setName] = useState("");
  const [live, setLive] = useState<number | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [synced, setSynced] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);
  const deviceRef = useRef<BtDevice | null>(null);
  const lastUploadRef = useRef<number | null>(null);
  const hadReadings = useRef(hasReadings);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "bluetooth" in navigator);
    setWaiting(readQueue(farmId).length);
  }, [farmId]);

  // Keep "x min ago" fresh.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const post = useCallback(async (items: UploadReading[]): Promise<boolean> => {
    try {
      const r = await fetch(`/api/farms/${farmId}/soil`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(items) });
      return r.ok;
    } catch {
      return false;
    }
  }, [farmId]);

  const afterSent = useCallback(() => {
    setLastSentAt(Date.now());
    if (!hadReadings.current) {
      hadReadings.current = true;
      router.refresh(); // the "Soil now" card appears once the farm has readings
    }
  }, [router]);

  /** Send the offline queue, oldest first, in batches. */
  const flush = useCallback(async () => {
    let q = readQueue(farmId);
    while (q.length) {
      const batch = q.slice(0, 200);
      if (!(await post(batch))) break;
      q = q.slice(batch.length);
      writeQueue(farmId, q);
      afterSent();
    }
    setWaiting(readQueue(farmId).length);
  }, [farmId, post, afterSent]);

  /** Upload now, or keep in the offline queue if there is no internet. */
  const send = useCallback(async (items: UploadReading[]) => {
    if (!items.length) return;
    if (await post(items)) {
      afterSent();
      void flush();
    } else {
      writeQueue(farmId, enqueue(readQueue(farmId), items));
      setWaiting(readQueue(farmId).length);
    }
  }, [farmId, post, afterSent, flush]);

  useEffect(() => {
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    void flush();
    return () => window.removeEventListener("online", onOnline);
  }, [flush]);

  useEffect(() => () => { try { deviceRef.current?.gatt?.disconnect(); } catch { /* already gone */ } }, []);

  async function connect() {
    setError(null);
    const bt = (navigator as Navigator & { bluetooth?: BtApi }).bluetooth;
    if (!bt) return setSupported(false);
    setState("connecting");
    try {
      const dev = await bt.requestDevice({ filters: [{ services: [PROBE.service] }] });
      deviceRef.current = dev;
      dev.addEventListener("gattserverdisconnected", () => { setState("idle"); setLive(null); setError(labels.lost); });
      const server = await dev.gatt!.connect();
      const service = await server.getPrimaryService(PROBE.service);
      const deviceName = dev.name ?? "PaaniProbe";

      // Live readings: show them, and upload one a minute.
      const reading = await service.getCharacteristic(PROBE.reading);
      await reading.startNotifications();
      reading.addEventListener("characteristicvaluechanged", (e) => {
        const r = parseReading(decode(e));
        if (!r) return;
        setLive(r.moisturePct);
        const now = Date.now();
        if (shouldUpload(lastUploadRef.current, now)) {
          lastUploadRef.current = now;
          void send([toUpload(new Date(now), r.moisturePct, deviceName)]);
        }
      });

      // Stored readings from while the phone was away: collect until "END", then upload as one batch.
      const history = await service.getCharacteristic(PROBE.history);
      const batch: UploadReading[] = [];
      await history.startNotifications();
      history.addEventListener("characteristicvaluechanged", (e) => {
        const h = parseHistoryLine(decode(e), new Date());
        if (h === "END") {
          setSynced((n) => n + batch.length);
          void send(batch.splice(0));
        } else if (h) batch.push(toUpload(h.timestamp, h.moisturePct, deviceName));
      });
      const control = await service.getCharacteristic(PROBE.control);
      await control.writeValue(new TextEncoder().encode("H"));

      setName(deviceName);
      setState("connected");
    } catch {
      setState("idle");
      setError(labels.notFound);
    }
  }

  function disconnect() {
    try { deviceRef.current?.gatt?.disconnect(); } catch { /* ignore */ }
    setState("idle");
    setLive(null);
  }

  const minsAgo = lastSentAt ? Math.max(0, Math.round((Date.now() - lastSentAt) / 60_000)) : null;
  return (
    <Card className={cn(hasReadings || state === "connected" ? "border-sky-300" : "border-dashed bg-slate-50 opacity-80")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {state === "connected" ? <BluetoothConnected className="h-5 w-5 text-sky-700" aria-hidden /> : <Bluetooth className="h-5 w-5 text-slate-500" aria-hidden />} {labels.title}
        </CardTitle>
        <p className="text-sm text-slate-600">{labels.intro}</p>
        {!hasReadings && state !== "connected" && <p className="text-sm font-semibold text-slate-700">{labels.notConnected} <span className="font-normal">{labels.needs}</span></p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!supported ? (
          <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{labels.unsupported}</p>
        ) : (
          <>
            {state === "connected" && (
              <div>
                <p className="text-xs font-medium text-slate-600">{fill(labels.connected, { name })}</p>
                <p className="text-xs font-medium text-slate-600">{labels.live}</p>
                <p className="num text-4xl font-bold tabular-nums text-sky-800" aria-live="polite"><bdi dir="ltr">{live === null ? "…" : live.toFixed(1)}</bdi><span className="text-xl">%</span></p>
              </div>
            )}
            <button type="button" onClick={state === "connected" ? disconnect : connect} disabled={state === "connecting"}
              className="min-h-12 rounded-xl bg-sky-700 px-4 font-semibold text-white disabled:opacity-60">
              {state === "connecting" ? labels.connecting : state === "connected" ? labels.disconnect : labels.connect}
            </button>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-2 text-sm text-red-800">{error}</p>}
            {minsAgo !== null && <p className="text-xs text-slate-600">{fill(labels.uploaded, { mins: minsAgo })}</p>}
            {synced > 0 && <p className="text-xs text-slate-600">{fill(labels.history, { n: synced })}</p>}
            {waiting > 0 && <p className="text-xs font-medium text-amber-800">{fill(labels.waiting, { n: waiting })}</p>}
          </>
        )}
        <p className="text-xs text-slate-500">{labels.prototype}</p>
      </CardContent>
    </Card>
  );
}
