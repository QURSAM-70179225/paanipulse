/** Turns engine state into a pump recommendation. Pure. */
import { DEFAULTS } from "./config";
import { clamp, roundTo } from "./units";

/** Recommended hours = gross volume ÷ expected hourly flow, rounded to 0.5 h and clamped 0…max. */
export function recommendedHours(grossM3: number, flowM3PerHour: number, maxHours: number = DEFAULTS.maxPumpHoursPerDay): number {
  if (grossM3 <= 0 || flowM3PerHour <= 0) return 0;
  return clamp(roundTo(grossM3 / flowM3PerHour, DEFAULTS.hoursStep), 0, maxHours);
}

export type AdviceKind = "irrigate" | "keep-off" | "skip-rain";

/**
 * Why a forecast shower was NOT trusted enough to skip irrigation (the "rain is a bet" safeguard):
 * weather data unreliable, a critical growth stage, forecast rain too close to the need, or no safe buffer if it misses.
 */
export type RainDeclined = "weather" | "critical" | "margin" | "buffer";

export interface Advice {
  kind: AdviceKind;
  /** Hours to run today (0 for keep-off / skip-rain). */
  hoursToday: number;
  /** Total hours this irrigation needs (may span several days if > hours available today). */
  totalHours: number;
  /** Gross volume to pump today (m³). */
  grossM3Today: number;
  /** Days until the next irrigation is due (keep-off / skip-rain). null = beyond horizon. */
  daysUntilNext: number | null;
  /** Expected mean flow per hour today (m³/h). */
  flowM3PerHour: number;
  /** Effective rain expected tomorrow (mm). */
  rainTomorrowMm: number;
  /** Net water the soil needs this irrigation (mm at the root zone). 0 when no irrigation is advised. */
  netMm: number;
  /** Depth to apply at the field edge after irrigation losses (mm): netMm ÷ method efficiency. */
  grossMm: number;
  /** Set when forecast rain would have covered the need but was not trusted enough to skip irrigation. */
  rainDeclined?: RainDeclined;
  /** Why irrigation is advised/next: soil reached RAW, or a critical growth stage. */
  reason?: "raw" | "critical-stage";
  /** Critical stage id (e.g. "cri") when reason is critical-stage. */
  stageId?: string;
}

/** A critical-stage window relative to today (in days) and the minimum depletion that triggers it (mm). */
export interface CriticalWindow {
  id: string;
  startInDays: number;
  endInDays: number;
  minDepletionMm: number;
}

export interface BalanceAdviceInput {
  depletionStartMm: number;
  rawMm: number;
  /** Forecast (today first) of ETc − effective rain per day (mm); may be negative on rainy days. */
  forecastNetUseMm: number[];
  effRainTomorrowMm: number;
  areaM2: number;
  irrigationEfficiency: number;
  flowM3PerHour: number;
  hoursAvailableToday: number;
  /** Used to extrapolate beyond the forecast horizon (mm/day). */
  fallbackNetUseMm?: number;
  /** Optional critical growth stage (e.g. wheat CRI). */
  critical?: CriticalWindow;
  /** Total available water in the root zone (mm). Used to check it is safe to wait if the forecast rain misses. */
  tawMm?: number;
  /** False when the weather is offline sample data: never skip irrigation for forecast rain then. Default true. */
  weatherReliable?: boolean;
}

/** Decide whether forecast rain is trusted enough to skip irrigation. Returns the reason it is not, or "skip". */
export function rainVerdict(i: { needMm: number; rainMm: number; critical: boolean; weatherReliable: boolean; waitIsSafe: boolean }): "skip" | RainDeclined {
  if (!i.weatherReliable) return "weather";
  if (i.critical) return "critical";
  if (i.rainMm < i.needMm * DEFAULTS.rainSkipSafetyFactor) return "margin";
  if (!i.waitIsSafe) return "buffer";
  return "skip";
}

/**
 * Soil-water-balance advice (non-flooded crops).
 * Irrigate today if depletion at end of today would reach RAW (refill to field capacity),
 * unless tomorrow's rain alone covers the refill. Otherwise report days until RAW is reached.
 */
export function adviseFromBalance(i: BalanceAdviceInput): Advice {
  const base = { flowM3PerHour: i.flowM3PerHour, rainTomorrowMm: i.effRainTomorrowMm, netMm: 0, grossMm: 0 };
  const endToday = Math.max(0, i.depletionStartMm + (i.forecastNetUseMm[0] ?? 0));
  const c = i.critical;
  const criticalToday = !!c && c.startInDays <= 0 && c.endInDays >= 0 && endToday >= c.minDepletionMm && endToday > 0;
  if (endToday >= i.rawMm || criticalToday) {
    const why = endToday >= i.rawMm ? { reason: "raw" as const } : { reason: "critical-stage" as const, stageId: c!.id };
    let rainDeclined: RainDeclined | undefined;
    if (i.effRainTomorrowMm >= endToday) {
      // If the rain misses, tomorrow's depletion must still be inside the safe buffer before we may wait for it.
      const dryDayUse = Math.max(0, i.fallbackNetUseMm ?? 0);
      const limit = i.tawMm !== undefined ? i.rawMm + DEFAULTS.rainWaitBufferFraction * Math.max(0, i.tawMm - i.rawMm) : i.rawMm * 1.25;
      const verdict = rainVerdict({ needMm: endToday, rainMm: i.effRainTomorrowMm, critical: criticalToday, weatherReliable: i.weatherReliable ?? true, waitIsSafe: endToday + dryDayUse <= limit });
      if (verdict === "skip") return { ...base, ...why, kind: "skip-rain", hoursToday: 0, totalHours: 0, grossM3Today: 0, daysUntilNext: 1 };
      rainDeclined = verdict;
    }
    const grossTotal = ((endToday / 1000) * i.areaM2) / i.irrigationEfficiency;
    const totalHours = i.flowM3PerHour > 0 ? roundTo(grossTotal / i.flowM3PerHour, DEFAULTS.hoursStep) : 0;
    const cap = Math.min(DEFAULTS.maxPumpHoursPerDay, Math.max(0, i.hoursAvailableToday));
    const hoursToday = clamp(totalHours, 0, cap);
    return {
      ...base, ...why, kind: "irrigate", hoursToday, totalHours, grossM3Today: hoursToday * i.flowM3PerHour, daysUntilNext: 0,
      netMm: endToday, grossMm: endToday / i.irrigationEfficiency, ...(rainDeclined ? { rainDeclined } : {}),
    };
  }
  // Walk the forecast to find when depletion reaches RAW (or the critical-stage threshold inside its window).
  let dr = endToday;
  let daysUntilNext: number | null = null;
  let reason: Advice["reason"];
  for (let k = 1; k < i.forecastNetUseMm.length; k++) {
    dr = Math.max(0, dr + i.forecastNetUseMm[k]);
    if (dr >= i.rawMm) {
      daysUntilNext = k;
      reason = "raw";
      break;
    }
    if (c && k >= c.startInDays && k <= c.endInDays && dr >= c.minDepletionMm) {
      daysUntilNext = k;
      reason = "critical-stage";
      break;
    }
  }
  if (daysUntilNext === null) {
    const rate = i.fallbackNetUseMm ?? average(i.forecastNetUseMm.filter((x) => x > 0));
    daysUntilNext = rate > 0 ? i.forecastNetUseMm.length - 1 + Math.ceil((i.rawMm - dr) / rate) : null;
  }
  return { ...base, kind: "keep-off", hoursToday: 0, totalHours: 0, grossM3Today: 0, daysUntilNext, ...(reason ? { reason } : {}), ...(reason === "critical-stage" ? { stageId: c!.id } : {}) };
}

/** Flooded rice: daily need model (ETc + percolation − effective rain). Skip if tomorrow's rain covers today's need. */
export function adviseFlooded(i: {
  netNeedTodayMm: number;
  effRainTomorrowMm: number;
  areaM2: number;
  irrigationEfficiency: number;
  flowM3PerHour: number;
  hoursAvailableToday: number;
  /** False when the weather is offline sample data: never skip irrigation for forecast rain then. Default true. */
  weatherReliable?: boolean;
}): Advice {
  const base = { flowM3PerHour: i.flowM3PerHour, rainTomorrowMm: i.effRainTomorrowMm, daysUntilNext: null, netMm: 0, grossMm: 0 };
  if (i.netNeedTodayMm <= 0) return { ...base, kind: "keep-off", hoursToday: 0, totalHours: 0, grossM3Today: 0, daysUntilNext: 1 };
  let rainDeclined: RainDeclined | undefined;
  if (i.effRainTomorrowMm >= i.netNeedTodayMm) {
    // A flooded paddy has a standing-water buffer, so only the data-quality and margin checks apply.
    const verdict = rainVerdict({ needMm: i.netNeedTodayMm, rainMm: i.effRainTomorrowMm, critical: false, weatherReliable: i.weatherReliable ?? true, waitIsSafe: true });
    if (verdict === "skip") return { ...base, kind: "skip-rain", hoursToday: 0, totalHours: 0, grossM3Today: 0, daysUntilNext: 1 };
    rainDeclined = verdict;
  }
  const gross = ((i.netNeedTodayMm / 1000) * i.areaM2) / i.irrigationEfficiency;
  const cap = Math.min(DEFAULTS.maxPumpHoursPerDay, Math.max(0, i.hoursAvailableToday));
  const totalHours = recommendedHours(gross, i.flowM3PerHour, 24);
  const hoursToday = clamp(totalHours, 0, cap);
  return {
    ...base, kind: "irrigate", hoursToday, totalHours, grossM3Today: hoursToday * i.flowM3PerHour,
    netMm: i.netNeedTodayMm, grossMm: i.netNeedTodayMm / i.irrigationEfficiency, ...(rainDeclined ? { rainDeclined } : {}),
  };
}

function average(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}
