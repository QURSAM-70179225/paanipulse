/**
 * "Enough water has reached the probe": the cue for a farmer who is away from the field to go and switch the pump off.
 * Pure. It never switches anything: the farmer acts. It reports that **water reached the probe's spot**, which is not proof
 * that the whole field is wet (one probe shows one place), so the message always tells the farmer to check the field.
 *
 * A reading counts as "filled" only if ALL of these hold (thresholds are our choice; confirm with an agronomist):
 *  1. enough readings (at least 2, so one noisy value cannot trigger it);
 *  2. the newest reading is recent (so old data and back-filled history never alert);
 *  3. the last 2 readings are both close to field capacity (depleted fraction ≤ FULL_FRACTION);
 *  4. the soil actually got wetter in the last few hours (a rise of at least RISE_PP percentage points),
 *     so a soil that was already wet all day does not trigger a "switch the pump off" message.
 */
import { depletedFraction, soilLimits, type SoilLimits } from "./soil";

export const FULL_FRACTION = 0.15;
export const RISE_WINDOW_HOURS = 3;
export const RISE_PP = 3;
export const CONSECUTIVE_FULL = 2;
/** The newest reading must be no older than this (minutes). */
export const FRESH_MINUTES = 30;

export interface MoistureSample {
  at: Date;
  pct: number;
}

export type FullReason = "filled" | "too-few" | "stale" | "not-full" | "no-rise";

export function fieldFilled(samples: MoistureSample[], now: Date = new Date(), limits: SoilLimits = soilLimits()): { filled: boolean; reason: FullReason } {
  const s = [...samples].sort((a, b) => a.at.getTime() - b.at.getTime());
  if (s.length < CONSECUTIVE_FULL) return { filled: false, reason: "too-few" };
  const latest = s[s.length - 1];
  if (now.getTime() - latest.at.getTime() > FRESH_MINUTES * 60_000) return { filled: false, reason: "stale" };
  const lastN = s.slice(-CONSECUTIVE_FULL);
  if (!lastN.every((x) => depletedFraction(x.pct, limits) <= FULL_FRACTION)) return { filled: false, reason: "not-full" };
  const windowStart = latest.at.getTime() - RISE_WINDOW_HOURS * 3_600_000;
  const earlier = s.filter((x) => x.at.getTime() >= windowStart && x.at.getTime() < latest.at.getTime());
  const low = earlier.length ? Math.min(...earlier.map((x) => x.pct)) : latest.pct;
  if (latest.pct - low < RISE_PP) return { filled: false, reason: "no-rise" };
  return { filled: true, reason: "filled" };
}
