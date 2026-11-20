"use client";

import { useMemo, useState } from "react";
import { Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEASONS, SOIL_TYPES, STAGES, waterLookup, type CropType, type IrrigationMethod, type Season, type SoilType, type Stage } from "@/lib/engine";
import { cn } from "@/lib/utils";

export interface ChartLabels {
  title: string; intro: string; crop: string; stage: string; soil: string; season: string; method: string; area: string; flow: string;
  result: string; use: string; daily: string; every: string; rice: string; hours: string; perAcre: string; note: string;
  tableTitle: string;
  crops: Record<CropType, string>; stages: Record<Stage, string>; soils: Record<SoilType, string>; seasons: Record<Season, string>; methods: Record<IrrigationMethod, string>;
}

const METHODS: IrrigationMethod[] = ["flood", "furrow", "sprinkler", "drip"];
const CROP_IDS: CropType[] = ["wheat", "rice", "maize", "cotton", "sugarcane"];
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
const n0 = (x: number) => Math.round(x).toLocaleString("en-US");

/** The water chart: pick crop, stage, soil, season, method and land; get the water. Runs fully in the browser (no network). */
export function WaterChart({ labels }: { labels: ChartLabels }) {
  const [crop, setCrop] = useState<CropType>("wheat");
  const [stage, setStage] = useState<Stage>("mid");
  const [soil, setSoil] = useState<SoilType>("loam");
  const [season, setSeason] = useState<Season>("mild");
  const [method, setMethod] = useState<IrrigationMethod>("flood");
  const [acres, setAcres] = useState("10");
  const [flow, setFlow] = useState("");

  const areaAcres = Number(acres);
  const flowM3h = Number(flow);
  const w = useMemo(
    () => (areaAcres > 0 ? waterLookup({ crop, stage, soil, season, irrigationMethod: method, areaAcres, pumpFlowM3h: flowM3h > 0 ? flowM3h : undefined }) : null),
    [crop, stage, soil, season, method, areaAcres, flowM3h],
  );
  // Quick table: every stage for the chosen crop and soil, mild season, one acre.
  const table = useMemo(
    () => STAGES.map((st) => ({ stage: st, ...waterLookup({ crop, stage: st, soil, season: "mild", irrigationMethod: method, areaAcres: 1 }) })),
    [crop, soil, method],
  );

  const sel = "num h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";
  const lab = "flex flex-col gap-1 text-sm font-medium text-slate-700";
  const Select = <T extends string>({ text, value, set, options, names }: { text: string; value: T; set: (v: T) => void; options: readonly T[]; names: Record<T, string> }) => (
    <label className={lab}>{text}
      <select className={sel} value={value} onChange={(e) => set(e.target.value as T)}>
        {options.map((o) => <option key={o} value={o}>{names[o]}</option>)}
      </select>
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5 text-sky-700" aria-hidden /> {labels.title}</CardTitle><p className="text-sm text-slate-600">{labels.intro}</p></CardHeader>
        <CardContent className="grid gap-3">
          <Select text={labels.crop} value={crop} set={setCrop} options={CROP_IDS} names={labels.crops} />
          <Select text={labels.stage} value={stage} set={setStage} options={STAGES} names={labels.stages} />
          <Select text={labels.soil} value={soil} set={setSoil} options={SOIL_TYPES} names={labels.soils} />
          <Select text={labels.season} value={season} set={setSeason} options={SEASONS} names={labels.seasons} />
          <Select text={labels.method} value={method} set={setMethod} options={METHODS} names={labels.methods} />
          <label className={lab}>{labels.area}<input className={sel} type="number" inputMode="decimal" min={0.5} max={500} step={0.5} value={acres} onChange={(e) => setAcres(e.target.value)} /></label>
          <label className={lab}>{labels.flow}<input className={sel} type="number" inputMode="decimal" min={0} step={1} value={flow} onChange={(e) => setFlow(e.target.value)} /></label>
        </CardContent>
      </Card>

      {w && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardHeader><CardTitle>{labels.result}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-base text-slate-900" aria-live="polite">
            <p>{fill(labels.use, { mm: w.etcMmDay })}</p>
            {w.flooded
              ? <p className="font-semibold">{fill(labels.rice, { mm: w.grossMm, m3: n0(w.m3PerIrrigation), l: n0(w.litresPerIrrigation) })}</p>
              : <p className="font-semibold">{fill(labels.every, { n: w.intervalDays, mm: w.grossMm, m3: n0(w.m3PerIrrigation), l: n0(w.litresPerIrrigation) })}</p>}
            <p>{fill(labels.daily, { l: n0(w.litresPerDay) })}</p>
            <p className="text-sm text-slate-700">{fill(labels.perAcre, { l: n0(w.litresPerAcrePerDay) })}</p>
            {w.pumpHours !== null && <p>{fill(labels.hours, { flow: flowM3h, h: w.pumpHours })}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">{fill(labels.tableTitle, { crop: labels.crops[crop] })}</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {table.map((r) => (
                <tr key={r.stage} className={cn("border-b border-slate-100 last:border-0", r.stage === stage && "bg-sky-50 font-semibold")}>
                  <th scope="row" className="py-2 pe-2 text-start font-medium">{labels.stages[r.stage]}</th>
                  <td className="num py-2 text-end"><bdi dir="ltr">{n0(r.litresPerAcrePerDay)}</bdi></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="px-1 text-xs text-slate-600">{labels.note}</p>
    </div>
  );
}
