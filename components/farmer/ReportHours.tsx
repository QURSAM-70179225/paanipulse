"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { queueReport } from "@/lib/offline";

export function ReportHours({ farmId, labels, listen }: { farmId: string; listen?: ReactNode; labels: { title: string; help: string; other: string; save: string; thanks: string; hours: string; error: string; queued: string } }) {
  const router = useRouter();
  const [custom, setCustom] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error" | "queued">("idle");
  const [, start] = useTransition();

  async function save(hours: number) {
    setState("busy");
    const res = await fetch(`/api/farms/${farmId}/hours`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours, daysAgo: 1 }) }).catch(() => null);
    if (!res) {
      // No connection: keep the report on the phone and send it later.
      queueReport({ farmId, hours, daysAgo: 1 });
      return setState("queued");
    }
    if (!res.ok) return setState("error");
    setState("done");
    start(() => router.refresh());
  }

  if (state === "queued") return <p role="status" className="rounded-2xl bg-amber-50 p-4 text-amber-950">{labels.queued}</p>;
  if (state === "done") return <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">{labels.thanks}</p>;
  return (
    <Card className="border-amber-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-amber-700" aria-hidden /> {labels.title}</CardTitle>
        <p className="text-sm text-slate-600">{labels.help}</p>
        {listen && <div className="flex">{listen}</div>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-5 gap-2">
          {[0, 2, 4, 6, 8].map((h) => (
            <button key={h} type="button" disabled={state === "busy"} onClick={() => save(h)}
              className="num h-12 rounded-xl border-2 border-slate-200 bg-white text-lg font-bold text-slate-900 hover:border-emerald-600 disabled:opacity-50">
              {h}
            </button>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(custom); if (custom !== "" && n >= 0 && n <= 14) save(n); }}>
          <label className="sr-only" htmlFor="hours-other">{labels.other}</label>
          <input id="hours-other" className="num h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-3" type="number" inputMode="decimal" min={0} max={14} step={0.5} placeholder={`${labels.other} (${labels.hours})`} value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button type="submit" disabled={state === "busy"} className={cn("h-12 rounded-xl bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50")}>{labels.save}</button>
        </form>
        {state === "error" && <p role="alert" className="text-sm text-red-700">{labels.error}</p>}
      </CardContent>
    </Card>
  );
}
