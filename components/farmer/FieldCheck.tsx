"use client";

import { useState } from "react";
import { ClipboardList, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { More } from "@/components/ui/more";
import type { DictKey } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

interface Check { id: string; takenAt: string; hour: number; measuredLph: number; predictedLph: number; errorPct: number; powerSource: string; calibrated: boolean }
interface Summary { count: number; meanAbsErrorPct: number | null; beforeCalibration: number | null; afterCalibration: number | null; checks: Check[] }

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
const n0 = (x: number) => Math.round(x).toLocaleString("en-US");

export function FieldCheck({ farmId, initial, d, listen }: { farmId: string; initial: Summary; d: Record<DictKey, string>; listen?: React.ReactNode }) {
  const [summary, setSummary] = useState<Summary>(initial);
  const [f, setF] = useState({ volumeL: 200, seconds: 22, hour: 12, inverterKw: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const input = "num h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";
  const label = "flex flex-col gap-1 text-xs font-medium text-slate-700";
  const resultText = (c: Check) =>
    fill(d.fcResult, { pred: n0(c.predictedLph), meas: n0(c.measuredLph), dir: c.errorPct >= 0 ? d.fcHigh : d.fcLow, pct: Math.abs(c.errorPct).toFixed(0) });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/farms/${farmId}/field-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volumeL: f.volumeL, seconds: f.seconds, hour: f.hour, inverterKw: f.inverterKw ? Number(f.inverterKw) : null }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setMsg({ ok: false, text: data.error === "no-power-at-hour" ? d.fcNoPower : d.errGeneric });
    setSummary(data.summary);
    setMsg({ ok: true, text: resultText(data.check) });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-sky-700" aria-hidden /> {d.fcTitle}</CardTitle>
          <div className="shrink-0">{listen}</div>
        </div>
        <More label={d.moreInfo}><p>{d.fcIntro}</p></More>
      </CardHeader>
      <CardContent>
        <form className="grid grid-cols-2 gap-2" onSubmit={submit}>
          <label className={label}>{d.bucketVolume}<input className={input} type="number" min={5} max={2000} value={f.volumeL} onChange={(e) => setF({ ...f, volumeL: Number(e.target.value) })} required /></label>
          <label className={label}>{d.bucketSeconds}<input className={input} type="number" min={1} step="0.5" value={f.seconds} onChange={(e) => setF({ ...f, seconds: Number(e.target.value) })} required /></label>
          <label className={label}>{d.bucketHour}<input className={input} type="number" min={6} max={18} value={f.hour} onChange={(e) => setF({ ...f, hour: Number(e.target.value) })} required /></label>
          <label className={label}>{d.fcInverter}<input className={input} type="number" min={0.1} step="0.1" inputMode="decimal" value={f.inverterKw} onChange={(e) => setF({ ...f, inverterKw: e.target.value })} /></label>
          <button disabled={busy} className="col-span-2 mt-1 h-12 rounded-xl bg-sky-700 font-semibold text-white hover:bg-sky-800 disabled:opacity-60">{d.fcSubmit}</button>
        </form>
        {msg && <p role="status" className={cn("mt-3 rounded-xl p-3 text-sm", msg.ok ? "bg-sky-50 text-sky-900" : "bg-red-50 text-red-800")}>{msg.text}</p>}
        {summary.count > 0 && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-semibold text-slate-900"><ClipboardList className="h-4 w-4" aria-hidden /> {fill(d.fcSummary, { n: summary.count, pct: (summary.meanAbsErrorPct ?? 0).toFixed(0) })}</p>
            {summary.beforeCalibration !== null && summary.afterCalibration !== null && (
              <p className="text-slate-700">{fill(d.fcBeforeAfter, { b: summary.beforeCalibration.toFixed(0), a: summary.afterCalibration.toFixed(0) })}</p>
            )}
            <ul className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
              {summary.checks.slice(0, 5).map((c) => (
                <li key={c.id} className="num" dir="ltr">
                  {new Date(c.takenAt).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" })} {String(c.hour).padStart(2, "0")}:00 · {n0(c.measuredLph)} vs {n0(c.predictedLph)} L/h · {c.errorPct >= 0 ? "+" : ""}{c.errorPct.toFixed(0)}% · {c.powerSource === "inverter" ? d.fcSourceInverter : d.fcSourceSun}{c.calibrated ? " · ✓" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
