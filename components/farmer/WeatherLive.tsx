"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, Snowflake, Sun, Thermometer, Wind } from "lucide-react";
import { conditionFor, type Condition } from "@/lib/weatherCode";
import { cn } from "@/lib/utils";

export interface LiveCurrent { tempC: number; feelsLikeC: number | null; humidityPct: number | null; windKmh: number | null; code: number | null; time: string | null }
export interface LiveHour { time: string; tempC: number | null; humidityPct: number | null; windKmh: number | null; rainChancePct: number | null }
export interface WeatherLiveData { source: "live" | "cached-live" | "openweather" | "sample"; current: LiveCurrent | null; hourly: LiveHour[] }

export interface WeatherLiveLabels {
  feels: string; humidity: string; wind: string; rainToday: string; highLow: string; updated: string; offline: string;
  kmh: string; mm: string; hourlyTitle: string; rainChance: string; auto: string; nowLabel: string;
  sourceLive: string; sourceSaved: string; sourceSample: string; sourceOpenWeather: string;
  conditions: Record<Condition, string>;
}

const ICON: Record<Condition, React.ElementType> = { clear: Sun, partly: CloudSun, cloudy: Cloud, fog: CloudFog, drizzle: CloudRain, rain: CloudRain, storm: CloudLightning, snow: Snowflake };
const POLL_MS = 5 * 60_000;

/** Current weather + next 24 hours. Polls the server while the page is visible, and when the tab comes back. */
export function WeatherLive({ farmId, initial, today, labels }: {
  farmId: string;
  initial: WeatherLiveData;
  today: { tMax: number | null; tMin: number | null; precipMm: number };
  labels: WeatherLiveLabels;
}) {
  const [data, setData] = useState<WeatherLiveData>(initial);
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (busy.current || document.visibilityState !== "visible") return;
      busy.current = true;
      try {
        const res = await fetch(`/api/farms/${farmId}/weather-now`, { cache: "no-store" });
        if (res.ok && alive) setData(await res.json());
      } catch {
        /* keep the last values */
      } finally {
        busy.current = false;
      }
    };
    const id = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [farmId]);

  const now = data.current;
  const cond = conditionFor(now?.code);
  const CondIcon = cond ? ICON[cond] : Thermometer;
  const when = now?.time ? now.time.slice(11, 16) : null;
  const sourceLabel = data.source === "live" ? labels.sourceLive : data.source === "cached-live" ? labels.sourceSaved : data.source === "openweather" ? labels.sourceOpenWeather : labels.sourceSample;
  const mini = (Icon: React.ElementType, label: string, value: string) => (
    <div className="rounded-xl bg-slate-50 p-2 text-center">
      <Icon className="mx-auto h-4 w-4 text-sky-700" aria-hidden />
      <p className="mt-0.5 text-[11px] leading-tight text-slate-600">{label}</p>
      <p className="num text-sm font-bold text-slate-900"><bdi dir="ltr">{value}</bdi></p>
    </div>
  );

  return (
    <div>
      {now ? (
        <div className="flex items-center gap-3">
          <CondIcon className="h-12 w-12 shrink-0 text-amber-500" aria-hidden />
          <div>
            <p className="num text-4xl font-bold text-slate-900" aria-live="polite"><bdi dir="ltr">{Math.round(now.tempC)}°C</bdi></p>
            <p className="text-sm text-slate-700">{cond ? labels.conditions[cond] : ""}{now.feelsLikeC !== null ? ` · ${labels.feels.replace("{t}", String(Math.round(now.feelsLikeC)))}` : ""}</p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{labels.offline}</p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {mini(Thermometer, labels.highLow, `${today.tMax !== null ? Math.round(today.tMax) : "–"}° / ${today.tMin !== null ? Math.round(today.tMin) : "–"}°`)}
        {mini(CloudRain, labels.rainToday, `${today.precipMm.toFixed(1)} ${labels.mm}`)}
        {now?.humidityPct != null && mini(Droplets, labels.humidity, `${Math.round(now.humidityPct)}%`)}
        {now?.windKmh != null && mini(Wind, labels.wind, `${Math.round(now.windKmh)} ${labels.kmh}`)}
      </div>
      {when && <p className="mt-2 text-xs text-slate-500">{labels.updated.replace("{t}", when)} · {sourceLabel}</p>}

      {data.hourly.length > 0 && (
        <section aria-label={labels.hourlyTitle} className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">{labels.hourlyTitle}</h3>
          <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2" dir="ltr">
            {data.hourly.map((h, i) => (
              <li key={h.time} className={cn("flex w-[3.9rem] shrink-0 flex-col items-center rounded-xl py-2 text-center text-xs", i === 0 ? "bg-sky-100" : "bg-slate-50")}>
                <span className="num font-semibold text-slate-800">{i === 0 ? labels.nowLabel : h.time.slice(11, 13) + ":00"}</span>
                <span className="num mt-1 text-base font-bold text-slate-900">{h.tempC !== null ? `${Math.round(h.tempC)}°` : "–"}</span>
                <span className="num text-slate-600" title={labels.humidity}>{h.humidityPct !== null ? `${Math.round(h.humidityPct)}%` : "–"}</span>
                <span className="num text-slate-600" title={labels.wind}>{h.windKmh !== null ? `${Math.round(h.windKmh)}` : "–"}<span className="text-[10px]"> km/h</span></span>
                <span className={cn("num mt-0.5", (h.rainChancePct ?? 0) >= 40 ? "font-semibold text-indigo-800" : "text-slate-500")} title={labels.rainChance}>
                  <CloudRain className="mr-0.5 inline h-3 w-3" aria-hidden />{h.rainChancePct !== null ? `${Math.round(h.rainChancePct)}%` : "–"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
