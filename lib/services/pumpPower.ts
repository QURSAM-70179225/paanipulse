/** Pump input power at a given local hour today, from Mode B (sunlight). Server-only. */
import "server-only";
import { pktDateKey, pktDayStart } from "@/lib/dates";
import { dayOfYear, hourlyGhiFromDaily, mjToKwh, modeBHourly, type PumpSpec } from "@/lib/engine";
import { getWeather } from "./weather";

export async function pumpKwAtHour(lat: number, lng: number, pump: PumpSpec, hour: number, now = new Date()) {
  const w = await getWeather(lat, lng, { now });
  const key = pktDateKey(pktDayStart(0, now));
  const day = w.days.find((d) => d.date === key) ?? w.days[w.days.length - 8] ?? w.days[0];
  const ghi = day.hourlyGhi ?? hourlyGhiFromDaily(mjToKwh(day.radiationMj), lat, dayOfYear(new Date(`${day.date}T00:00:00Z`)));
  const h = modeBHourly(pump, ghi)[Math.max(0, Math.min(23, Math.floor(hour)))];
  return { pumpKw: h.pumpKw, ghi: h.ghi };
}
