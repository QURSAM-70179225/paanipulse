/**
 * Soil-probe interpretation (pure functions). A probe reports volumetric water content (VWC, %).
 * We turn it into the same "how much of the available water is used" fraction the FAO-56 balance uses,
 * so the probe and the calculation can be compared. The probe is a second opinion: it does not change advice hours.
 */
import { DEFAULTS } from "./config";
import { clamp } from "./units";

/** Typical loam field capacity (% VWC). Soil-specific calibration would replace this. */
export const SOIL_FC_PCT = 30;
/** Readings older than this are shown as "old" and are not used for the cross-check (hours). */
export const SOIL_FRESH_HOURS = 6;
/** The probe and the model "agree" when their depleted fractions differ by less than this. */
export const SOIL_AGREE_TOLERANCE = 0.2;
/** Below this depleted fraction the soil counts as "wet" (close to field capacity). */
export const SOIL_WET_FRACTION = 0.2;

export interface SoilLimits {
  /** Field capacity, % VWC. */
  fcPct: number;
  /** Permanent wilting point, % VWC. */
  pwpPct: number;
}

/** Field capacity and wilting point (% VWC) from the soil's available water capacity (mm per m). */
export function soilLimits(awcMmPerM: number = DEFAULTS.soilAwcMmPerM, fcPct: number = SOIL_FC_PCT): SoilLimits {
  return { fcPct, pwpPct: fcPct - awcMmPerM / 10 };
}

/** Share of the available water already used: 0 = field capacity, 1 = wilting point. */
export function depletedFraction(vwcPct: number, limits: SoilLimits = soilLimits()): number {
  const span = limits.fcPct - limits.pwpPct;
  return span > 0 ? clamp((limits.fcPct - vwcPct) / span, 0, 1) : 0;
}

export type SoilStatus = "wet" | "ok" | "dry";

/** "dry" once the readily available water is used up (fraction ≥ p), "wet" close to field capacity. */
export function soilStatus(fraction: number, p: number): SoilStatus {
  if (fraction >= p) return "dry";
  if (fraction < SOIL_WET_FRACTION) return "wet";
  return "ok";
}

export type SoilCheck = "agree" | "sensor-wetter" | "sensor-drier";

/** Compare the probe's depleted fraction with the water-balance model's. */
export function crossCheck(modelFraction: number, sensorFraction: number, tolerance: number = SOIL_AGREE_TOLERANCE): SoilCheck {
  const diff = sensorFraction - modelFraction;
  if (Math.abs(diff) < tolerance) return "agree";
  return diff < 0 ? "sensor-wetter" : "sensor-drier";
}

export const isFresh = (readingAt: Date, now: Date = new Date(), maxHours: number = SOIL_FRESH_HOURS) =>
  (now.getTime() - readingAt.getTime()) / 3_600_000 <= maxHours;

export type SalinityLevel = "normal" | "high";
/** Bulk EC (dS/m) is only an indicator; ≥ 2 is flagged as high. */
export const salinityLevel = (ecDsM: number): SalinityLevel => (ecDsM >= 2 ? "high" : "normal");
