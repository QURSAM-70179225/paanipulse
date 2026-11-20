"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Sprout, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FertLabels {
  title: string; intro: string; enter: string; change: string; cancel: string; save: string;
  urea: string; dap: string; sop: string; perAcre: string; splits: string; splitsN: string; splitsOne: string; bagsShort: string;
  source: string; srcSoil: string; srcOfficer: string; srcOther: string; confirm: string;
  tooHigh: string; empty: string; error: string; totals: string; bags: string; schedule: string; atSowing: string;
  dose: string; markApplied: string; undo: string; applied: string;
  hintApply: string; hintRain: string; hintWait: string; hintDone: string; disclaimer: string; savedBy: string;
}

type Product = "urea" | "dap" | "sop";
interface Line { product: Product; bags: number; kg: number }
export interface FertView {
  plan: { urea: number; dap: number; sop: number; ureaSplits: 1 | 2 | 3; ureaApplied: number; source: "soil-test" | "officer" | "other" };
  totals: Line[];
  schedule: { id: string; kind: "sowing" | "urea"; dose?: number; lines: Line[]; applied: boolean }[];
  hint: { kind: "apply"; dose: number; bags: number } | { kind: "hold-rain"; dose: number; rainMm: number } | { kind: "wait" } | { kind: "done" } | null;
}

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
const MAX: Record<Product, number> = { urea: 6, dap: 4, sop: 3 };

export function FertiliserPlan({ farmId, areaLabel, fert, labels }: { farmId: string; areaLabel: string; fert: FertView | null; labels: FertLabels }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    urea: String(fert?.plan.urea ?? ""), dap: String(fert?.plan.dap ?? ""), sop: String(fert?.plan.sop ?? ""),
    splits: fert?.plan.ureaSplits ?? 2, source: (fert?.plan.source ?? "officer") as "soil-test" | "officer" | "other", confirmed: false,
  });
  const name: Record<Product, string> = { urea: labels.urea, dap: labels.dap, sop: labels.sop };
  const input = "num h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";

  async function save() {
    const rates = { urea: Number(f.urea || 0), dap: Number(f.dap || 0), sop: Number(f.sop || 0) };
    for (const p of ["urea", "dap", "sop"] as const) {
      if (!(rates[p] >= 0) || rates[p] > MAX[p]) return setError(fill(labels.tooHigh, { product: name[p], max: MAX[p] }));
    }
    if (rates.urea + rates.dap + rates.sop <= 0) return setError(labels.empty);
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/farms/${farmId}/fertiliser`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rates, ureaSplits: f.splits, source: f.source, confirmed: true }),
      });
      if (!r.ok) return setError(labels.error);
      setEditing(false);
      router.refresh();
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  }

  async function mark(action: "applied" | "undo") {
    setBusy(true);
    try {
      await fetch(`/api/farms/${farmId}/fertiliser`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const showForm = editing || !fert;
  const srcLabel = fert ? { "soil-test": labels.srcSoil, officer: labels.srcOfficer, other: labels.srcOther }[fert.plan.source] : "";
  const hint = fert?.hint;
  const hintText =
    hint?.kind === "apply" ? fill(labels.hintApply, { k: hint.dose, bags: hint.bags })
    : hint?.kind === "hold-rain" ? fill(labels.hintRain, { mm: hint.rainMm })
    : hint?.kind === "wait" ? labels.hintWait
    : hint?.kind === "done" ? labels.hintDone : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sprout className="h-5 w-5 text-emerald-700" aria-hidden /> {labels.title}</CardTitle>
        {showForm && <p className="text-sm text-slate-600">{labels.intro}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {showForm ? (
          <>
            {(["urea", "dap", "sop"] as const).map((p) => (
              <label key={p} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                {name[p]} <span className="font-normal text-slate-500">· {labels.perAcre}</span>
                <input className={input} type="number" inputMode="decimal" min={0} max={MAX[p]} step={0.25} value={f[p]} onChange={(e) => setF({ ...f, [p]: e.target.value })} />
              </label>
            ))}
            <div>
              <p className="text-sm font-medium text-slate-700">{labels.splits}</p>
              <div className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label={labels.splits}>
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={f.splits === n} onClick={() => setF({ ...f, splits: n as 1 | 2 | 3 })}
                    className={cn("min-h-11 rounded-xl border-2 text-sm font-semibold", f.splits === n ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-800")}>
                    {n === 1 ? labels.splitsOne : fill(labels.splitsN, { n })}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              {labels.source}
              <select className={input} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as typeof f.source })}>
                <option value="soil-test">{labels.srcSoil}</option>
                <option value="officer">{labels.srcOfficer}</option>
                <option value="other">{labels.srcOther}</option>
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={f.confirmed} onChange={(e) => setF({ ...f, confirmed: e.target.checked })} />
              {labels.confirm}
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-2 text-sm text-red-800">{error}</p>}
            <div className="flex gap-2">
              <button type="button" disabled={busy || !f.confirmed} onClick={save} className="h-11 flex-1 rounded-xl bg-emerald-700 font-semibold text-white disabled:opacity-50">{labels.save}</button>
              {fert && <button type="button" onClick={() => { setEditing(false); setError(null); }} className="h-11 rounded-xl border border-slate-300 px-4 font-semibold text-slate-800">{labels.cancel}</button>}
            </div>
          </>
        ) : (
          fert && (
            <>
              {hintText && (
                <p className={cn("rounded-xl p-3 text-sm font-medium", hint?.kind === "apply" ? "bg-emerald-50 text-emerald-900" : hint?.kind === "hold-rain" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-800")}>{hintText}</p>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-700">{fill(labels.totals, { area: areaLabel })}</p>
                <ul className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {fert.totals.map((l) => (
                    <li key={l.product} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="font-medium">{name[l.product]}</span>
                      <span className="num font-bold"><bdi dir="ltr">{fill(labels.bags, { n: l.bags, kg: l.kg.toLocaleString("en-US") })}</bdi></span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{labels.schedule}</p>
                <ol className="mt-1 flex flex-col gap-1.5">
                  {fert.schedule.map((d) => (
                    <li key={d.id} className={cn("flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm", d.applied ? "border-emerald-200 bg-emerald-50" : "border-slate-200")}>
                      <span>
                        <span className="font-medium">{d.kind === "sowing" ? labels.atSowing : fill(labels.dose, { k: d.dose ?? 0, n: fert.plan.ureaSplits })}</span>
                        <span className="num block text-xs text-slate-600"><bdi dir="ltr">{d.lines.map((l) => `${name[l.product]} ${l.bags} ${labels.bagsShort}`).join(" · ")}</bdi></span>
                      </span>
                      {d.applied && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800"><Check className="h-4 w-4" aria-hidden /> {labels.applied}</span>}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-wrap gap-2">
                {fert.plan.urea > 0 && fert.plan.ureaApplied < fert.plan.ureaSplits && (
                  <button type="button" disabled={busy} onClick={() => mark("applied")} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
                    {fill(labels.markApplied, { k: fert.plan.ureaApplied + 1 })}
                  </button>
                )}
                {fert.plan.ureaApplied > 0 && (
                  <button type="button" disabled={busy} onClick={() => mark("undo")} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800">
                    <Undo2 className="h-4 w-4" aria-hidden /> {labels.undo}
                  </button>
                )}
                <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800">{labels.change}</button>
              </div>
              <p className="text-xs text-slate-500">{fill(labels.savedBy, { source: srcLabel })}</p>
              <p className="text-xs text-slate-600">{labels.disclaimer}</p>
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
