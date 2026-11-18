/** Savings and value estimates. All clearly labelled as estimates in the UI. Pure. */
import { DEFAULTS, SURPLUS_USES } from "./config";

/** Energy (kWh) spent lifting excess water: excess_m3 × kWh/m³. */
export const wastedKwh = (excessM3: number, kwhPerM3: number) => Math.max(0, excessM3) * kwhPerM3;

/** Value (Rs) of surplus solar energy at a given rate. */
export const surplusValueRs = (kwh: number, rsPerKwh: number = DEFAULTS.surplusRsPerKwh) => Math.max(0, kwh) * rsPerKwh;

/**
 * Nitrogen leached with deep percolation (kg N).
 * 1 mm over 1 ha = 10 m³ = 10,000 L; at C mg/L nitrate-N that carries C × 0.01 kg N.
 */
export function leachedNKg(deepPercolationMm: number, areaM2: number, nitrateNMgPerL: number = DEFAULTS.leachateNitrateNMgPerL): number {
  return Math.max(0, deepPercolationMm) * (areaM2 / 10_000) * nitrateNMgPerL * 0.01;
}

/** Urea (kg) and its value (Rs) equivalent to an amount of N. */
export function ureaEquivalent(nKg: number) {
  const kg = nKg / DEFAULTS.ureaNFraction;
  return { kg, rs: kg * DEFAULTS.ureaRsPerKg };
}

/** Income ideas for spare solar kWh. */
export function surplusIdeas(kwh: number) {
  return SURPLUS_USES.map((u) => ({ ...u, kwh, rs: Math.round(kwh * u.rsPerKwh) }));
}
