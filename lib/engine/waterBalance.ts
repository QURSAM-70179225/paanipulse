/** Simplified FAO-56 root-zone soil-water balance (Ch. 8, "bucket" model). Pure functions. */
import { CROPS, DEFAULTS, FALLOW, type CropType } from "./config";
import { clamp } from "./units";

/** Effective rooting depth (m): grows linearly from rootMin at sowing to max at end of development. */
export function rootDepthM(crop: CropType, daysSinceSowing: number, rootMin = DEFAULTS.rootMinM): number {
  if (daysSinceSowing < 0) return FALLOW.rootM;
  const c = CROPS[crop];
  const growDays = c.stages[0] + c.stages[1];
  return rootMin + (c.rootMaxM - rootMin) * clamp(daysSinceSowing / growDays, 0, 1);
}

/** Total available water in the root zone (mm). */
export const tawMm = (rootM: number, awcMmPerM = DEFAULTS.soilAwcMmPerM) => awcMmPerM * rootM;

/** Readily available water (mm) = p × TAW. */
export const rawMm = (taw: number, p: number) => p * taw;

export interface BalanceStep {
  /** Root-zone depletion at end of day (mm, 0 = field capacity). */
  depletionMm: number;
  /** Water that drained below the root zone (mm). */
  deepPercolationMm: number;
}

/**
 * One day of the balance: Dr_end = Dr_start + ETc − effective rain − net irrigation.
 * Water that would push Dr below 0 is lost as deep percolation. Dr cannot exceed TAW.
 */
export function balanceStep(depletionStartMm: number, etcMm: number, effRainMm: number, netIrrigationMm: number, taw: number): BalanceStep {
  const dr = depletionStartMm + etcMm - effRainMm - netIrrigationMm;
  if (dr < 0) return { depletionMm: 0, deepPercolationMm: -dr };
  return { depletionMm: Math.min(dr, taw), deepPercolationMm: 0 };
}
