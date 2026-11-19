/**
 * Weather service: Open-Meteo forecast API (free, no key) with three fallbacks, in order:
 *   1. in-memory cache (30 min by default; WEATHER_CACHE_MINUTES)
 *   2. OpenWeatherMap backup (only with OPENWEATHER_API_KEY; ET0 and sunlight are estimated)
 *   3. last successful live response saved in the database (WeatherCache table)
 *   3. DEMO_MODE offline sample (data/sample-weather.json), clearly flagged as "sample"
 */
import { z } from "zod";
import type { WeatherDay } from "@/lib/engine";
import { pktDateKey, pktDayStart } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { sampleWeather } from "./sampleWeather";
import { fetchOpenWeather } from "./openweather";

export type WeatherSource = "live" | "cached-live" | "openweather" | "sample";

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

/** One hour of the forecast. `time` is local (Asia/Karachi), "YYYY-MM-DDTHH:00". */
export interface HourPoint {
  time: string;
  tempC: number | null;
  humidityPct: number | null;
  windKmh: number | null;
  rainChancePct: number | null;
}

export interface WeatherResult {
  current?: CurrentWeather | null;
  /** Hourly temperature, humidity, wind and rain chance from yesterday to the end of the forecast. */
  hourly?: HourPoint[];
  days: WeatherDay[];
  source: WeatherSource;
  fetchedAt: string;
  lat: number;
  lng: number;
}

const PAST_DAYS = 31;
const FORECAST_DAYS = 7;
/** How long a live answer is reused before asking Open-Meteo again (its "current" block updates every ~15 min). */
const ttlMs = () => (Number(process.env.WEATHER_CACHE_MINUTES) > 0 ? Number(process.env.WEATHER_CACHE_MINUTES) : 30) * 60_000;
const TIMEOUT_MS = 8_000;

/** Why the last live attempt failed (shown by /api/health?full=1 so a "sample" badge can be diagnosed). */
let lastFailure: { at: string; message: string } | null = null;
export const lastWeatherFailure = () => lastFailure;

/** One request, plus one retry after a quick network error, 429 or 5xx (shared cloud IPs are sometimes throttled). */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (res.ok || (res.status !== 429 && res.status < 500)) return res;
      lastErr = new Error(`HTTP ${res.status}`);
      lastFailure = { at: new Date().toISOString(), message: `HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 140)}` };
    } catch (err) {
      lastErr = err;
      lastFailure = { at: new Date().toISOString(), message: `${(err as Error).name}: ${(err as Error).message}`.slice(0, 160) };
    }
    // Retry only after a quick refusal; never after a timeout (that would double the wait for the farmer).
    if ((lastErr as Error)?.name === "TimeoutError" || (lastErr as Error)?.name === "AbortError") break;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  throw lastErr;
}

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
      temperature_2m: z.array(z.number().nullable()).optional(),
      relative_humidity_2m: z.array(z.number().nullable()).optional(),
      wind_speed_10m: z.array(z.number().nullable()).optional(),
      precipitation_probability: z.array(z.number().nullable()).optional(),
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
    hourly: "shortwave_radiation,temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
    timezone: "Asia/Karachi",
  });
  // Free tier needs no key (non-commercial use). For commercial use, Open-Meteo issues an API key
  // that is sent to the "customer-api" host.
  // OPEN_METEO_BASE_URL points at a self-hosted Open-Meteo (it is open source) or a test double.
  const custom = process.env.OPEN_METEO_BASE_URL?.replace(/\/$/, "");
  const key = opts.forceFree ? undefined : process.env.OPEN_METEO_API_KEY;
  if (key) p.set("apikey", key);
  const host = custom ?? (key ? "https://customer-api.open-meteo.com" : "https://api.open-meteo.com");
  return `${host}/v1/forecast?${p}`;
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

/** Hourly temperature / humidity / wind / rain chance from yesterday onwards (keeps the saved copy small). Exported for tests. */
export function parseHourlyPoints(json: unknown, now: Date = new Date()): HourPoint[] {
  const parsed = OpenMeteoSchema.safeParse(json);
  const h = parsed.success ? parsed.data.hourly : undefined;
  if (!h || !h.temperature_2m) return [];
  const from = `${pktDateKey(pktDayStart(-1, now))}T00:00`;
  const out: HourPoint[] = [];
  h.time.forEach((time, i) => {
    if (time < from) return;
    out.push({
      time,
      tempC: h.temperature_2m?.[i] ?? null,
      humidityPct: h.relative_humidity_2m?.[i] ?? null,
      windKmh: h.wind_speed_10m?.[i] ?? null,
      rainChancePct: h.precipitation_probability?.[i] ?? null,
    });
  });
  return out;
}

/** The next `n` hours starting with the current local hour. */
export function nextHours(hourly: HourPoint[] | undefined, now: Date = new Date(), n = 24): HourPoint[] {
  if (!hourly?.length) return [];
  const local = new Date(now.getTime() + 5 * 3_600_000).toISOString().slice(0, 13) + ":00"; // Pakistan is UTC+5 all year
  return hourly.filter((p) => p.time >= local).slice(0, n);
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
  if (hit && Date.now() - hit.at < ttlMs()) return hit.result;

  try {
    let res = await fetchWithRetry(buildUrl(lat, lng));
    if ((res.status === 401 || res.status === 403 || res.status === 400) && process.env.OPEN_METEO_API_KEY) {
      // The configured key was rejected (wrong provider or expired): keep working on the free service.
      console.warn(`OPEN_METEO_API_KEY rejected (HTTP ${res.status}); falling back to the free Open-Meteo endpoint.`);
      res = await fetchWithRetry(buildUrl(lat, lng, { forceFree: true }));
    }
    if (!res.ok) {
      lastFailure = { at: new Date().toISOString(), message: `HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 140)}` };
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }
    const json = await res.json();
    const days = parseOpenMeteo(json);
    if (days.length < FORECAST_DAYS) throw new Error("Open-Meteo returned too few days");
    const result: WeatherResult = { current: parseCurrent(json), hourly: parseHourlyPoints(json, opts.now), days, source: "live", fetchedAt: new Date().toISOString(), lat, lng };
    memory.set(key, { at: Date.now(), result });
    await writeSavedCache(key, result);
    return result;
  } catch (err) {
    const disk = await readSavedCache(key);
    const todayKey = pktDateKey(pktDayStart(0, opts.now));
    if (process.env.OPENWEATHER_API_KEY) {
      try {
        // History (days before today) comes from the last saved real weather if it is contiguous up to yesterday, else the sample.
        const yesterdayKey = pktDateKey(pktDayStart(-1, opts.now));
        const saved = disk?.days.filter((d) => d.date < todayKey) ?? [];
        const history = saved.length && saved[saved.length - 1].date === yesterdayKey ? saved : sampleWeather(opts.now).filter((d) => d.date < todayKey);
        const ow = await fetchOpenWeather(lat, lng, { history, todayKey });
        const result: WeatherResult = { current: ow.current, hourly: ow.hourly, days: ow.days, source: "openweather", fetchedAt: new Date().toISOString(), lat, lng };
        memory.set(key, { at: Date.now(), result });
        return result;
      } catch (owErr) {
        lastFailure = { at: new Date().toISOString(), message: `${lastFailure?.message ?? (err as Error).message} | ${(owErr as Error).message}`.slice(0, 300) };
      }
    }
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
    memory.set(key, { at: Date.now() - ttlMs() + 5 * 60 * 1000, result });
    return result;
  }
}
