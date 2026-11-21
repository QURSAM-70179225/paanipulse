"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Power, PowerOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { More } from "@/components/ui/more";
import { signalWord } from "@/lib/devices/code";
import { cn } from "@/lib/utils";

export interface PumpCtlLabels {
  title: string; on: string; off: string; left: string; offline: string; never: string; hours: string; start: string; stop: string; confirm: string;
  auto: string; autoNote: string; safety: string; errOffline: string; errBusy: string; errHours: string; errDisabled: string; errGeneric: string; log: string;
  offlineRunning: string; network: string; signalGood: string; signalFair: string; signalWeak: string;
  autoTitle: string; autoTime: string; autoNeedsProbe: string; more: string;
  actions: Record<string, string>; actors: Record<string, string>;
}

interface View {
  available: boolean; enabled: boolean; on: boolean; remainingSeconds: number; offAt: string | null; online: boolean; deviceSeenAt: string | null;
  autoStopWhenFull: boolean; network: string | null; signal: number | null; log: { at: string; actor: string; action: string; detail: string | null }[];
}

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
const hm = (sec: number) => `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}`;
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" });

/**
 * Remote start and stop of the pump through a SIM control box. Shown once a control box is linked to this farm with its code.
 * Every run has a hard stop time; the control box enforces it on its own clock, so a weak or lost network cannot keep it running.
 */
export function PumpControl({ farmId, advisedHours, hasProbe, listen, labels }: { farmId: string; advisedHours: number; hasProbe: boolean; listen?: React.ReactNode; labels: PumpCtlLabels }) {
  const router = useRouter();
  const [v, setV] = useState<View | null>(null);
  const [hours, setHours] = useState(String(advisedHours > 0 ? Math.min(12, Math.max(0.5, advisedHours)) : 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/farms/${farmId}/pump`, { cache: "no-store" });
      if (r.ok) setV(await r.json());
    } catch { /* keep the last state */ }
  }, [farmId]);

  useEffect(() => {
    void load();
    const a = setInterval(load, 10_000);
    const b = setInterval(() => tick((n) => n + 1), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [load]);

  async function post(body: object) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/farms/${farmId}/pump`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d.error === "advice-off" && window.confirm(labels.confirm)) return post({ ...body, confirmOverride: true });
        const map: Record<string, string> = { offline: labels.errOffline, busy: labels.errBusy, hours: labels.errHours, disabled: labels.errDisabled };
        if (d.error !== "advice-off") setError(map[d.error] ?? labels.errGeneric);
        return;
      }
      setV(d);
      router.refresh();
    } catch {
      setError(labels.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  if (!v || !v.available || !v.enabled) return null;
  const left = v.on && v.offAt ? Math.max(0, Math.floor((new Date(v.offAt).getTime() - Date.now()) / 1000)) : 0;
  const mins = v.deviceSeenAt ? Math.round((Date.now() - new Date(v.deviceSeenAt).getTime()) / 60_000) : null;
  const sig = signalWord(v.signal);
  const netLine = v.network || sig ? fill(labels.network, { n: [v.network, sig === "good" ? labels.signalGood : sig === "fair" ? labels.signalFair : sig === "weak" ? labels.signalWeak : null].filter(Boolean).join(" · ") }) : null;

  return (
    <Card className={cn(v.on ? "border-emerald-400" : "border-slate-300")}>
      <CardHeader>
<div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {v.on ? <Power className="h-5 w-5 text-emerald-700" aria-hidden /> : <PowerOff className="h-5 w-5 text-slate-500" aria-hidden />} {labels.title}
          </CardTitle>
          <div className="shrink-0">{listen}</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div aria-live="polite">
          <p className={cn("text-2xl font-bold", v.on ? "text-emerald-700" : "text-slate-800")}>{v.on ? labels.on : labels.off}</p>
          {v.on && v.offAt && <p className="text-sm text-slate-700">{fill(labels.left, { t: `${hm(left)} (${clock(v.offAt)})` })}</p>}
        </div>

        {!v.online && (
          <p role="status" className="rounded-xl bg-amber-50 p-2 text-sm text-amber-900">
            {mins === null ? labels.never : fill(labels.offline, { mins })}
            {v.on && v.offAt && <span className="mt-1 block font-semibold">{fill(labels.offlineRunning, { t: clock(v.offAt) })}</span>}
          </p>
        )}
        {v.online && netLine && <p className="text-xs text-slate-600">{netLine}</p>}

        {v.on ? (
          <button type="button" disabled={busy} onClick={() => post({ action: "stop" })} className="min-h-14 rounded-xl bg-red-600 px-4 text-lg font-bold text-white disabled:opacity-60">{labels.stop}</button>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              {labels.hours}
              <input className="num h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base" type="number" inputMode="decimal" min={0.5} max={12} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
            </label>
            <button type="button" disabled={busy || !v.online} onClick={() => post({ action: "start", hours: Number(hours) })} className="min-h-14 rounded-xl bg-emerald-700 px-4 text-lg font-bold text-white disabled:opacity-50">{labels.start}</button>
          </>
        )}

        {/* The motor stops by itself: always at the end of the set time, and (with a soil probe) when the soil is wet enough. */}
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-slate-800">
          <p className="font-semibold text-emerald-900">{labels.autoTitle}</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked readOnly disabled />
            <span>{labels.autoTime}</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={hasProbe && v.autoStopWhenFull} disabled={busy || !hasProbe} onChange={(e) => post({ action: "auto-stop", enabled: e.target.checked })} />
            <span>{labels.auto}{!hasProbe && <span className="block text-xs text-slate-500">{labels.autoNeedsProbe}</span>}</span>
          </label>
        </div>

        {error && <p role="alert" className="rounded-xl bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        <More label={labels.more}>
          <p>{labels.autoNote}</p>
          <p>{labels.safety}</p>
        </More>

        {v.log.length > 0 && (
          <details className="text-xs text-slate-700">
            <summary className="cursor-pointer font-semibold">{labels.log}</summary>
            <ul className="mt-1 flex flex-col gap-0.5">
              {v.log.map((e, i) => (
                <li key={i}><span className="num" dir="ltr">{clock(e.at)}</span> · {labels.actors[e.actor] ?? e.actor}: {labels.actions[e.action] ?? e.action}{e.detail ? ` (${e.detail})` : ""}</li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
