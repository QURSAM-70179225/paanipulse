/**
 * Weather service: Open-Meteo forecast API (free, no key) with three fallbacks, in order:
 *   1. in-memory cache (1 h)
 *   2. last successful live response saved in the database (WeatherCache table)
 *   3. DEMO_MODE offline sample (data/sample-weather.json), clearly flagged as "sample"
 */
import { z } from "zod";
import type { WeatherDay } from "@/lib/engine";
import { pktDateKey, pktDayStart } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { sampleWeather } from "./sampleWeather";

export type WeatherSource = "live" | "cached-live" | "sample";

export interface WeatherResult {
  days: WeatherDay[];
  source: WeatherSource;
  fetchedAt: string;
  lat: number;
  lng: number;
}

const PAST_DAYS = 31;
const FORECAST_DAYS = 7;
const TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 6000;

const OpenMeteoSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    et0_fao_evapotranspiration: z.array(z.number().nullable()),
    precipitation_sum: z.array(z.number().nullable()),
    temperature_2m_max: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    shortwave_radiation_sum: z.array(z.number().nullable()),
  }),
  hourly: z
    .object({
      time: z.array(z.string()),
      shortwave_radiation: z.array(z.number().nullable()),
    })
    .optional(),
});

const memory = new Map<string, { at: number; result: WeatherResult }>();

/** Round to ~11 km so nearby farms share a cache entry (and we stay well inside the free-tier limits). */
const cacheKey = (lat: number, lng: number) => `${lat.toFixed(1)}_${lng.toFixed(1)}`;

export function buildUrl(lat: number, lng: number): string {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily: "et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min,shortwave_radiation_sum",
    hourly: "shortwave_radiation",
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
    timezone: "Asia/Karachi",
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

/** Convert an Open-Meteo response to engine WeatherDays. Exported for tests. */
export function parseOpenMeteo(json: unknown): WeatherDay[] {
  const data = OpenMeteoSchema.parse(json);
  const d = data.daily;
  // Hourly shortwave_radiation is the mean over the PRECEDING hour; shift so index h covers h→h+1.
  const hourlyByDate = new Map<string, number[]>();
  if (data.hourly) {
    data.hourly.time.forEach((t, i) => {
      const [date, hh] = t.split("T");
      const hour = Number(hh.slice(0, 2)) - 1;
      if (hour < 0) return;
      const arr = hourlyByDate.get(date) ?? new Array<number>(24).fill(0);
      arr[hour] = data.hourly!.shortwave_radiation[i] ?? 0;
      hourlyByDate.set(date, arr);
    });
  }
  return d.time
    .map((date, i) => ({
      date,
      et0Mm: d.et0_fao_evapotranspiration[i] ?? NaN,
      precipMm: d.precipitation_sum[i] ?? 0,
      radiationMj: d.shortwave_radiation_sum[i] ?? NaN,
      tMax: d.temperature_2m_max[i] ?? undefined,
      tMin: d.temperature_2m_min[i] ?? undefined,
      hourlyGhi: hourlyByDate.get(date),
    }))
    .filter((w) => Number.isFinite(w.et0Mm) && Number.isFinite(w.radiationMj));
}

const demoMode = () => (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false";

async function readSavedCache(key: string): Promise<WeatherResult | null> {
  try {
    const row = await prisma.weatherCache.findUnique({ where: { key } });
    return row ? (JSON.parse(row.json) as WeatherResult) : null;
  } catch {
    return null;
  }
}

async function writeSavedCache(key: string, result: WeatherResult) {
  try {
    const json = JSON.stringify(result);
    await prisma.weatherCache.upsert({ where: { key }, create: { key, json, fetchedAt: new Date() }, update: { json, fetchedAt: new Date() } });
  } catch {
    // DB unavailable — memory cache still works.
  }
}

export async function getWeather(lat: number, lng: number, opts: { now?: Date } = {}): Promise<WeatherResult> {
  const key = cacheKey(lat, lng);
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.result;

  try {
    const res = await fetch(buildUrl(lat, lng), { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const days = parseOpenMeteo(await res.json());
    if (days.length < FORECAST_DAYS) throw new Error("Open-Meteo returned too few days");
    const result: WeatherResult = { days, source: "live", fetchedAt: new Date().toISOString(), lat, lng };
    memory.set(key, { at: Date.now(), result });
    await writeSavedCache(key, result);
    return result;
  } catch (err) {
    const disk = await readSavedCache(key);
    const todayKey = pktDateKey(pktDayStart(0, opts.now));
    const tomorrowKey = pktDateKey(pktDayStart(1, opts.now));
    const usable = disk && disk.days.some((d) => d.date === todayKey) && disk.days.some((d) => d.date === tomorrowKey);
    if (disk && usable) {
      const result = { ...disk, source: "cached-live" as const };
      memory.set(key, { at: Date.now(), result });
      return result;
    }
    if (!demoMode()) throw err;
    const result: WeatherResult = { days: sampleWeather(opts.now), source: "sample", fetchedAt: new Date().toISOString(), lat, lng };
    // Retry live sooner than the normal TTL when we are on sample data.
    memory.set(key, { at: Date.now() - TTL_MS + 5 * 60 * 1000, result });
    return result;
  }
}
