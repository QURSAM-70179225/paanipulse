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

/** Conditions right now (Open-Meteo "current"). Null when only the offline sample is available. */
export interface CurrentWeather {
  tempC: number;
  feelsLikeC: number | null;
  humidityPct: number | null;
  windKmh: number | null;
  /** WMO weather code (0 clear … 3 overcast, 45 fog, 61+ rain, 95+ thunderstorm). */
  code: number | null;
  /** Local time of the observation, "YYYY-MM-DDTHH:mm" (Asia/Karachi). */
  time: string | null;
}

export interface WeatherResult {
  current?: CurrentWeather | null;
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
  current: z
    .object({
      time: z.string().optional(),
      temperature_2m: z.number().nullable().optional(),
      apparent_temperature: z.number().nullable().optional(),
      relative_humidity_2m: z.number().nullable().optional(),
      wind_speed_10m: z.number().nullable().optional(),
      weather_code: z.number().nullable().optional(),
    })
    .optional(),
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

export function buildUrl(lat: number, lng: number, opts: { forceFree?: boolean } = {}): string {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily: "et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min,shortwave_radiation_sum",
    hourly: "shortwave_radiation",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
    timezone: "Asia/Karachi",
  });
  // Free tier needs no key (non-commercial use). For commercial use, Open-Meteo issues an API key
  // that is sent to the "customer-api" host.
  const key = opts.forceFree ? undefined : process.env.OPEN_METEO_API_KEY;
  if (key) {
    p.set("apikey", key);
    return `https://customer-api.open-meteo.com/v1/forecast?${p}`;
  }
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

/** Pull the "right now" block out of an Open-Meteo response. Exported for tests. */
export function parseCurrent(json: unknown): CurrentWeather | null {
  const parsed = OpenMeteoSchema.safeParse(json);
  const c = parsed.success ? parsed.data.current : undefined;
  if (!c || typeof c.temperature_2m !== "number") return null;
  return {
    tempC: c.temperature_2m,
    feelsLikeC: c.apparent_temperature ?? null,
    humidityPct: c.relative_humidity_2m ?? null,
    windKmh: c.wind_speed_10m ?? null,
    code: c.weather_code ?? null,
    time: c.time ?? null,
  };
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
    let res = await fetch(buildUrl(lat, lng), { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if ((res.status === 401 || res.status === 403 || res.status === 400) && process.env.OPEN_METEO_API_KEY) {
      // The configured key was rejected (wrong provider or expired): keep working on the free service.
      console.warn(`OPEN_METEO_API_KEY rejected (HTTP ${res.status}); falling back to the free Open-Meteo endpoint.`);
      res = await fetch(buildUrl(lat, lng, { forceFree: true }), { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    }
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const json = await res.json();
    const days = parseOpenMeteo(json);
    if (days.length < FORECAST_DAYS) throw new Error("Open-Meteo returned too few days");
    const result: WeatherResult = { current: parseCurrent(json), days, source: "live", fetchedAt: new Date().toISOString(), lat, lng };
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
    const result: WeatherResult = { current: null, days: sampleWeather(opts.now), source: "sample", fetchedAt: new Date().toISOString(), lat, lng };
    // Retry live sooner than the normal TTL when we are on sample data.
    memory.set(key, { at: Date.now() - TTL_MS + 5 * 60 * 1000, result });
    return result;
  }
}
