/**
 * OpenWeatherMap backup provider (free plan: Current Weather + 5-day / 3-hour Forecast, units=metric).
 *
 * It does not provide ET0, solar radiation or history, so:
 *  - ET0 and sunlight are ESTIMATED from temperature range and cloud cover (lib/engine/weatherEstimate.ts)
 *  - the days before today come from `history` (last saved real weather, or the offline sample)
 * The app labels this source "OpenWeather (ET0 estimated)" everywhere.
 */
import { z } from "zod";
import type { WeatherDay } from "@/lib/engine";
import { dayOfYear, extraterrestrialRadiationMj, hargreavesEt0, radiationFromCloudCover } from "@/lib/engine";
import type { CurrentWeather, HourPoint } from "./weather";

const PKT_OFFSET_S = 5 * 3600; // Pakistan is UTC+5 all year

const Weather = z.object({ id: z.number() });
const Current = z.object({
  dt: z.number(),
  main: z.object({ temp: z.number(), feels_like: z.number().optional(), humidity: z.number().optional() }),
  wind: z.object({ speed: z.number().optional() }).optional(),
  weather: z.array(Weather).optional(),
});
const Item = z.object({
  dt: z.number(),
  main: z.object({ temp: z.number(), humidity: z.number().optional() }),
  wind: z.object({ speed: z.number().optional() }).optional(),
  clouds: z.object({ all: z.number() }).optional(),
  pop: z.number().optional(),
  rain: z.object({ "3h": z.number().optional() }).optional(),
  weather: z.array(Weather).optional(),
});
const Forecast = z.object({ list: z.array(Item).min(4) });

export type OwmCurrent = z.infer<typeof Current>;
export type OwmForecast = z.infer<typeof Forecast>;

/** OpenWeather condition id → the WMO-style code the UI already understands. */
export function owmToWmo(id: number | undefined): number | null {
  if (id === undefined) return null;
  if (id >= 200 && id < 300) return 95; // thunderstorm
  if (id >= 300 && id < 400) return 51; // drizzle
  if (id >= 500 && id < 600) return id >= 520 ? 80 : 61; // rain / showers
  if (id >= 600 && id < 700) return 71; // snow
  if (id >= 700 && id < 800) return 45; // mist, smoke, haze, fog (smog season)
  if (id === 800) return 0;
  if (id === 801 || id === 802) return 2;
  if (id === 803 || id === 804) return 3;
  return null;
}

const localIso = (dt: number) => new Date((dt + PKT_OFFSET_S) * 1000).toISOString(); // "YYYY-MM-DDTHH:mm:ss.sssZ" in local time

/** Build our weather shape from OpenWeather answers. Pure: exported for tests. */
export function buildFromOpenWeather(args: {
  current: OwmCurrent;
  forecast: OwmForecast;
  lat: number;
  /** Real or sample days BEFORE today, contiguous up to yesterday. */
  history: WeatherDay[];
  todayKey: string;
}): { current: CurrentWeather; hourly: HourPoint[]; days: WeatherDay[] } {
  const { current, forecast, lat, history, todayKey } = args;
  const items = [...forecast.list].sort((a, b) => a.dt - b.dt);
  // Start the hourly strip at the current hour (the first forecast mark can be up to 3 h ahead): use the observation.
  const nowHour = Math.floor(current.dt / 3600) * 3600;
  const hourlyItems = nowHour < items[0].dt
    ? [{ dt: nowHour, main: { temp: current.main.temp, humidity: current.main.humidity }, wind: current.wind, pop: items[0].pop }, ...items]
    : items;

  const cur: CurrentWeather = {
    tempC: current.main.temp,
    feelsLikeC: current.main.feels_like ?? null,
    humidityPct: current.main.humidity ?? null,
    windKmh: current.wind?.speed != null ? current.wind.speed * 3.6 : null,
    code: owmToWmo(current.weather?.[0]?.id),
    time: localIso(current.dt).slice(0, 16),
  };

  // 3-hourly → hourly (linear for temperature, humidity and wind; nearest value for rain chance).
  const hourly: HourPoint[] = [];
  for (let i = 0; i < hourlyItems.length - 1; i++) {
    const a = hourlyItems[i];
    const b = hourlyItems[i + 1];
    const steps = Math.max(1, Math.round((b.dt - a.dt) / 3600));
    for (let k = 0; k < steps; k++) {
      const f = k / steps;
      const mix = (x: number | undefined, y: number | undefined) => (x == null || y == null ? (x ?? y ?? null) : x + (y - x) * f);
      const nearest = f < 0.5 ? a : b;
      hourly.push({
        time: `${localIso(a.dt + k * 3600).slice(0, 13)}:00`,
        tempC: mix(a.main.temp, b.main.temp),
        humidityPct: mix(a.main.humidity, b.main.humidity),
        windKmh: mix(a.wind?.speed != null ? a.wind.speed * 3.6 : undefined, b.wind?.speed != null ? b.wind.speed * 3.6 : undefined),
        rainChancePct: nearest.pop != null ? Math.round(nearest.pop * 100) : null,
      });
    }
  }

  // Daily summaries from the 3-hour entries, by local date.
  const byDate = new Map<string, typeof items>();
  for (const it of items) {
    const date = localIso(it.dt).slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), it]);
  }
  const yesterday = history[history.length - 1];
  const forecastDays: WeatherDay[] = [];
  for (const [date, entries] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const isToday = date === todayKey;
    if (date < todayKey || (!isToday && entries.length < 5)) continue; // skip a thinly covered last day
    const temps = entries.map((e) => e.main.temp).concat(isToday ? [current.main.temp] : []);
    let tMax = Math.max(...temps);
    let tMin = Math.min(...temps);
    if (isToday && entries.length < 7 && yesterday?.tMax != null && yesterday.tMin != null) {
      // Only the rest of today is forecast: borrow half of yesterday's extremes so the temperature range is realistic.
      tMax = Math.max(tMax, (tMax + yesterday.tMax) / 2);
      tMin = Math.min(tMin, (tMin + yesterday.tMin) / 2);
    }
    const daytime = entries.filter((e) => {
      const h = Number(localIso(e.dt).slice(11, 13));
      return h >= 9 && h <= 15;
    });
    const clouds = (daytime.length ? daytime : entries).reduce((s, e) => s + (e.clouds?.all ?? 50), 0) / (daytime.length ? daytime.length : entries.length) / 100;
    const doy = dayOfYear(new Date(`${date}T00:00:00Z`));
    forecastDays.push({
      date,
      et0Mm: +hargreavesEt0(tMin, tMax, lat, doy).toFixed(2),
      precipMm: +entries.reduce((s, e) => s + (e.rain?.["3h"] ?? 0), 0).toFixed(1),
      radiationMj: +radiationFromCloudCover(extraterrestrialRadiationMj(lat, doy), clouds).toFixed(2),
      tMax: +tMax.toFixed(1),
      tMin: +tMin.toFixed(1),
    });
  }
  if (!forecastDays.some((d) => d.date === todayKey) && yesterday) forecastDays.unshift({ ...yesterday, date: todayKey, hourlyGhi: undefined }); // late evening: no entries left for today

  return { current: cur, hourly, days: [...history, ...forecastDays] };
}

/** Env values are often pasted with a trailing space/newline or surrounding quotes: strip them. */
export const cleanKey = (raw: string | undefined) => (raw ?? "").trim().replace(/^["']+|["']+$/g, "").trim();

export interface OwmOptions {
  history: WeatherDay[];
  todayKey: string;
}

/** Fetch current weather and the 5-day forecast, then convert. Throws on any failure (caller falls back). */
export async function fetchOpenWeather(lat: number, lng: number, opts: OwmOptions) {
  const key = cleanKey(process.env.OPENWEATHER_API_KEY);
  if (!key) throw new Error("OPENWEATHER_API_KEY not set");
  const base = (process.env.OPENWEATHER_BASE_URL || "https://api.openweathermap.org").replace(/\/$/, "");
  const q = new URLSearchParams({ lat: lat.toFixed(4), lon: lng.toFixed(4), units: "metric", appid: key });
  const get = async (path: string) => {
    const res = await fetch(`${base}/data/2.5/${path}?${q}`, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) throw new Error(`OpenWeather ${path} HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 120)}`);
    return res.json();
  };
  const [cur, fc] = await Promise.all([get("weather"), get("forecast")]);
  return buildFromOpenWeather({ current: Current.parse(cur), forecast: Forecast.parse(fc), lat, history: opts.history, todayKey: opts.todayKey });
}
