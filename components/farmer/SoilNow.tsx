"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Sprout, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SoilLabels {
  title: string;
  moisture: string;
  dry: string;
  ok: string;
  wet: string;
  temp: string;
  salinity: string;
  salinityHigh: string;
  salinityNormal: string;
  nutrients: string;
  nutrientsNote: string;
  simulated: string;
  updated: string;
  stale: string;
  agree: string;
  sensorWetter: string;
  sensorDrier: string;
  secondOpinion: string;
  chartAria: string;
  zoneDry: string;
  zoneWet: string;
}

interface Soil {
  hasData: boolean;
  latest?: { at: string; moisturePct: number; temperatureC: number | null; ecDsM: number | null; nitrogenMgKg: number | null; phosphorusMgKg: number | null; potassiumMgKg: number | null; source: string };
  ageMinutes?: number;
  fresh?: boolean;
  sensorFraction?: number;
  modelFraction?: number | null;
  status?: "wet" | "ok" | "dry";
  check?: "agree" | "sensor-wetter" | "sensor-drier" | null;
  salinity?: "normal" | "high" | null;
  readyFraction?: number;
  limits?: { fcPct: number; pwpPct: number };
  series?: { t: string; m: number }[];
}

const STATUS_STYLE = { wet: "bg-sky-100 text-sky-900", ok: "bg-emerald-100 text-emerald-900", dry: "bg-amber-100 text-amber-900" } as const;

/** Tiny moisture sparkline for the last 24 h (percent, plain SVG). */
function Spark({ data, aria }: { data: { m: number }[]; aria: string }) {
  if (data.length < 2) return null;
  const lo = Math.min(...data.map((d) => d.m)), hi = Math.max(...data.map((d) => d.m));
  const span = Math.max(1, hi - lo);
  const pts = data.map((d, i) => `${((i / (data.length - 1)) * 100).toFixed(1)},${(28 - ((d.m - lo) / span) * 24).toFixed(1)}`).join(" ");
  return (
    <div dir="ltr">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={aria} className="h-10 w-full">
        <polyline points={pts} fill="none" stroke="#0369a1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/** Polls the farm's soil-probe endpoint. Rendered only for farms that already have probe readings. */
export function SoilNow({ farmId, labels }: { farmId: string; labels: SoilLabels }) {
  const [d, setD] = useState<Soil>({ hasData: false });

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/farms/${farmId}/soil`, { cache: "no-store" });
        if (r.ok && alive) setD(await r.json());
      } catch {
        /* keep the last reading */
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [farmId]);

  if (!d.hasData || !d.latest) return null;
  const l = d.latest;
  const status = d.status ?? "ok";
  const marker = Math.round((1 - (d.sensorFraction ?? 0)) * 100); // right = wet, left = dry
  const wetFrom = 80; // depleted fraction < 0.2 is "wet"
  const dryUntil = Math.round((1 - (d.readyFraction ?? 0.55)) * 100);
  const hasNutrients = l.nitrogenMgKg != null || l.phosphorusMgKg != null || l.potassiumMgKg != null;
  const ago = d.fresh
    ? labels.updated.replace("{mins}", String(d.ageMinutes ?? 0))
    : labels.stale.replace("{hours}", String(Math.round((d.ageMinutes ?? 0) / 60)));

  return (
    <Card className="border-sky-300">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Sprout className="h-5 w-5 text-emerald-700" aria-hidden /> {labels.title}
          {l.source === "simulator" && <span className="ms-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">{labels.simulated}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-600">{labels.moisture}</p>
            <p className="num text-4xl font-bold tabular-nums text-sky-800"><bdi dir="ltr">{l.moisturePct.toFixed(1)}</bdi><span className="text-xl">%</span></p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-sm font-bold", STATUS_STYLE[status])}>{status === "dry" ? labels.dry : status === "wet" ? labels.wet : labels.ok}</span>
        </div>

        <div className="mt-3" dir="ltr">
          <div className="relative h-3 overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 bg-amber-300" style={{ width: `${dryUntil}%` }} />
            <div className="absolute inset-y-0 bg-emerald-300" style={{ left: `${dryUntil}%`, width: `${wetFrom - dryUntil}%` }} />
            <div className="absolute inset-y-0 right-0 bg-sky-300" style={{ width: `${100 - wetFrom}%` }} />
            <div className="absolute inset-y-0 w-1 -translate-x-1/2 rounded bg-slate-900" style={{ left: `${Math.min(98, Math.max(2, marker))}%` }} aria-hidden />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{labels.zoneDry}</span><span>{labels.zoneWet}</span></div>
        </div>

        {d.series && <div className="mt-2"><Spark data={d.series} aria={labels.chartAria} /></div>}

        <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
          {l.temperatureC != null && (
            <div className="rounded-xl bg-slate-50 p-2">
              <Thermometer className="mx-auto h-4 w-4 text-amber-600" aria-hidden />
              <p className="leading-6 text-slate-600">{labels.temp}</p>
              <p className="num font-bold text-slate-900"><bdi dir="ltr">{l.temperatureC.toFixed(1)} °C</bdi></p>
            </div>
          )}
          {l.ecDsM != null && (
            <div className="rounded-xl bg-slate-50 p-2">
              <FlaskConical className="mx-auto h-4 w-4 text-violet-700" aria-hidden />
              <p className="leading-6 text-slate-600">{labels.salinity}</p>
              <p className="num font-bold text-slate-900"><bdi dir="ltr">{l.ecDsM.toFixed(1)} dS/m</bdi> · {d.salinity === "high" ? labels.salinityHigh : labels.salinityNormal}</p>
            </div>
          )}
        </div>

        {hasNutrients && (
          <div className="mt-2 rounded-xl border border-dashed border-slate-300 p-2 text-xs">
            <p className="font-semibold leading-6 text-slate-700">{labels.nutrients}</p>
            <p className="num mt-0.5 text-slate-800" dir="ltr">
              {l.nitrogenMgKg != null && <>N {Math.round(l.nitrogenMgKg)} </>}
              {l.phosphorusMgKg != null && <>· P {Math.round(l.phosphorusMgKg)} </>}
              {l.potassiumMgKg != null && <>· K {Math.round(l.potassiumMgKg)} </>}
              mg/kg
            </p>
            <p className="mt-0.5 leading-6 text-slate-500">{labels.nutrientsNote}</p>
          </div>
        )}

        {d.check && (
          <p className={cn("mt-3 rounded-xl p-2 text-sm", d.check === "agree" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900")}>
            {d.check === "agree" ? labels.agree : d.check === "sensor-wetter" ? labels.sensorWetter : labels.sensorDrier}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">{labels.secondOpinion} · {ago}</p>
      </CardContent>
    </Card>
  );
}
