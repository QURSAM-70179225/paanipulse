"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { More } from "@/components/ui/more";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface BucketLabels {
  title: string;
  intro: string;
  volume: string;
  seconds: string;
  hour: string;
  submit: string;
  result: string;
  reset: string;
  error: string;
  efficiencyNow: string;
  inverter: string;
  calibrated: string;
  defaultEstimate: string;
  more: string;
}

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

export function BucketTest({ farmId, efficiency, calibrated, listen, labels }: { farmId: string; efficiency: number; calibrated: boolean; listen?: React.ReactNode; labels: BucketLabels }) {
  const router = useRouter();
  const [volume, setVolume] = useState(200);
  const [seconds, setSeconds] = useState(21); // ≈ default efficiency at noon, so the demo narrows the range without shifting the headline numbers
  const [hour, setHour] = useState(12);
  const [inverterKw, setInverterKw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();

  async function post(body: unknown) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/farms/${farmId}/calibrate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      if (data.measuredLitresPerHour) {
        setMsg({
          ok: true,
          text: fill(labels.result, {
            lph: data.measuredLitresPerHour.toLocaleString("en-US"),
            before: Math.round(data.before.efficiency * 100),
            after: Math.round(data.after.efficiency * 100),
          }),
        });
      }
      start(() => router.refresh());
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error && e.message !== "error" ? e.message : labels.error });
    } finally {
      setBusy(false);
    }
  }

  const input = "num h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-violet-700" aria-hidden /> {labels.title}</CardTitle>
          <div className="shrink-0">{listen}</div>
        </div>
        <More label={labels.more}><p>{labels.intro}</p></More>
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
          {fill(labels.efficiencyNow, { pct: Math.round(efficiency * 100) })}
          <Badge variant={calibrated ? "default" : "warning"}>{calibrated ? labels.calibrated : labels.defaultEstimate}</Badge>
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-2 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            post({ volumeL: volume, seconds, hour, inverterKw: inverterKw ? Number(inverterKw) : null });
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            {labels.volume}
            <input className={input} type="number" inputMode="numeric" min={10} max={2000} value={volume} onChange={(e) => setVolume(Number(e.target.value))} required />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            {labels.seconds}
            <input className={input} type="number" inputMode="decimal" min={1} max={3600} step="0.5" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} required />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            {labels.hour}
            <input className={input} type="number" inputMode="numeric" min={6} max={18} value={hour} onChange={(e) => setHour(Number(e.target.value))} required />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            {labels.inverter}
            <input className={input} type="number" inputMode="decimal" min={0.3} step="0.1" value={inverterKw} onChange={(e) => setInverterKw(e.target.value)} />
          </label>
          <Button type="submit" disabled={busy} className="col-span-2 mt-1 h-12 bg-violet-700 hover:bg-violet-800">
            <FlaskConical className="h-4 w-4" aria-hidden /> {labels.submit}
          </Button>
        </form>
        {msg && (
          <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>
        )}
        {calibrated && (
          <button type="button" onClick={() => post({ reset: true })} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs text-slate-600 underline">
            <RotateCcw className="h-3 w-3" aria-hidden /> {labels.reset}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
