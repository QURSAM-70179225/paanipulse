import sample from "@/data/sample-weather.json";
import { pktDateKey, pktDayStart } from "@/lib/dates";
import type { WeatherDay } from "@/lib/engine";

/** Offline sample weather mapped onto real dates relative to `now` (Asia/Karachi). */
export function sampleWeather(now: Date = new Date()): WeatherDay[] {
  return sample.days.map((d) => ({
    date: pktDateKey(pktDayStart(d.offset, now)),
    et0Mm: d.et0Mm,
    precipMm: d.precipMm,
    radiationMj: d.radiationMj,
    tMax: d.tMax,
    tMin: d.tMin,
  }));
}
