"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Link2, Power, Radio, SignalHigh, SignalLow, SignalMedium, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signalWord } from "@/lib/devices/code";
import { cn } from "@/lib/utils";

export interface DeviceRow { id: string; kind: "probe" | "pump"; code: string; lastSeenAt: string | null; network: string | null; signal: number | null }

/** Texts shared by both cards. */
export interface DeviceSharedLabels {
  probe: string; pump: string; codeLabel: string; codePlaceholder: string; linking: string;
  waiting: string; lastSeen: string; justNow: string; signalGood: string; signalFair: string; signalWeak: string; remove: string; removeConfirm: string; removePumpConfirm: string;
  safetyTitle: string; safetyBody: string; safetyCheck: string; safetyLink: string; linkedProbe: string; linkedPump: string;
  errBadCode: string; errNotFound: string; errElsewhere: string; errPumpExists: string; errGeneric: string;
}
/** Texts for one card (probe or pump box). */
export interface DeviceCardLabels { title: string; intro: string; none: string; link: string; note: string; errWrongKind: string }

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

/**
 * One kind of SIM device on the farm: the soil probe card, or the pump control box card. They are separate devices with separate cards.
 * The farmer types the code printed on the device once; after that it works by itself over 2G, 3G or 4G, wherever the farmer is.
 * The probe card links only probes (a farm may have several). The pump card links one box, after the safety checklist, and then the
 * farmer can switch the motor on and off from anywhere with the Pump control card.
 */
export function DeviceCard({ kind, farmId, initial, labels, shared }: { kind: "probe" | "pump"; farmId: string; initial: DeviceRow[]; labels: DeviceCardLabels; shared: DeviceSharedLabels }) {
  const router = useRouter();
  const [all, setAll] = useState(initial);
  const devices = all.filter((d) => d.kind === kind);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [needsSafety, setNeedsSafety] = useState(false);
  const [safetyOk, setSafetyOk] = useState(false);
  // "Minutes ago" uses the clock, so it is only worked out in the browser after the page has loaded.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  async function link(safetyConfirmed: boolean) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await fetch(`/api/farms/${farmId}/devices`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, safetyConfirmed, kind }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d.error === "needs-safety") { setNeedsSafety(true); return; }
        const map: Record<string, string> = { "bad-code": shared.errBadCode, "not-found": shared.errNotFound, "linked-elsewhere": shared.errElsewhere, "pump-exists": shared.errPumpExists, "wrong-kind": labels.errWrongKind };
        setError(map[d.error] ?? shared.errGeneric);
        return;
      }
      setAll(d.devices);
      setDone(d.kind === "pump" ? shared.linkedPump : shared.linkedProbe);
      setCode("");
      setNeedsSafety(false);
      setSafetyOk(false);
      router.refresh();
    } catch {
      setError(shared.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: DeviceRow) {
    if (!window.confirm(d.kind === "pump" ? shared.removePumpConfirm : shared.removeConfirm)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/farms/${farmId}/devices/${d.id}`, { method: "DELETE" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setError(shared.errGeneric); return; }
      setAll(body.devices);
      router.refresh();
    } catch {
      setError(shared.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  const status = (d: DeviceRow) => {
    if (!d.lastSeenAt) return shared.waiting;
    if (now === null) return "";
    const mins = Math.max(0, Math.round((now - new Date(d.lastSeenAt).getTime()) / 60_000));
    const parts = [mins < 1 ? shared.justNow : fill(shared.lastSeen, { mins })];
    if (d.network) parts.push(d.network);
    const w = signalWord(d.signal);
    if (w) parts.push(w === "good" ? shared.signalGood : w === "fair" ? shared.signalFair : shared.signalWeak);
    return parts.join(" · ");
  };
  const SignalIcon = (q: number | null) => { const w = signalWord(q); return w === "good" ? SignalHigh : w === "fair" ? SignalMedium : SignalLow; };
  const TitleIcon = kind === "pump" ? Power : Radio;
  // One pump box per farm (one motor): hide the form once it is linked. Several probes are fine.
  const showForm = kind === "probe" || devices.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TitleIcon className={cn("h-5 w-5", kind === "pump" ? "text-emerald-700" : "text-sky-700")} aria-hidden /> {labels.title}</CardTitle>
        <p className="text-sm text-slate-600">{labels.intro}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {devices.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{labels.none}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {devices.map((d) => {
              const Icon = d.kind === "pump" ? Power : Radio;
              const Sig = SignalIcon(d.signal);
              return (
                <li key={d.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <Icon className={cn("h-6 w-6 shrink-0", d.kind === "pump" ? "text-emerald-700" : "text-sky-700")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{d.kind === "pump" ? shared.pump : shared.probe} <span className="num text-xs font-normal text-slate-500" dir="ltr">{d.code}</span></p>
                    <p className="flex items-center gap-1 text-xs text-slate-600">
                      {d.lastSeenAt && <Sig className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                      <span>{status(d)}</span>
                    </p>
                  </div>
                  <button type="button" disabled={busy} onClick={() => remove(d)} aria-label={shared.remove} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {showForm && <form
          className="flex flex-col gap-2"
          onSubmit={(e) => { e.preventDefault(); if (code.trim()) void link(false); }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {shared.codeLabel}
            <input
              className="num h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base uppercase tracking-wider"
              dir="ltr" autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text" maxLength={16}
              placeholder={shared.codePlaceholder} value={code}
              onChange={(e) => { setCode(e.target.value); setNeedsSafety(false); setError(null); setDone(null); }}
            />
          </label>
          {!needsSafety && (
            <button type="submit" disabled={busy || !code.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">
              <Link2 className="h-4 w-4" aria-hidden /> {busy ? shared.linking : labels.link}
            </button>
          )}
        </form>}

        {needsSafety && (
          <div role="alertdialog" aria-labelledby="pp-safety-title" className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p id="pp-safety-title" className="font-bold text-amber-950">{shared.safetyTitle}</p>
            <p className="text-sm text-amber-950">{shared.safetyBody}</p>
            <label className="flex items-start gap-2 text-sm text-slate-900">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={safetyOk} onChange={(e) => setSafetyOk(e.target.checked)} />
              <span>{shared.safetyCheck}</span>
            </label>
            <button type="button" disabled={busy || !safetyOk} onClick={() => link(true)} className="min-h-12 rounded-xl bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">
              {busy ? shared.linking : shared.safetyLink}
            </button>
          </div>
        )}

        {error && <p role="alert" className="rounded-xl bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        {done && <p role="status" className="rounded-xl bg-emerald-50 p-2 text-sm text-emerald-900">{done}</p>}
        <p className="text-xs text-slate-500">{labels.note}</p>
      </CardContent>
    </Card>
  );
}
