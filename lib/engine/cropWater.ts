/** FAO-56 crop water requirement (single crop coefficient). Pure functions. */
import { CROPS, DEFAULTS, FALLOW, type CropType } from "./config";
import { mmOverAreaToM3 } from "./units";

/**
 * Crop coefficient for a given day after sowing (FAO-56 Fig. 25):
 * flat Kc_ini, linear rise to Kc_mid over development, flat Kc_mid, linear fall to Kc_end over late season.
 * Before sowing (day < 0) the field is fallow.
 */
export function kcForDay(crop: CropType, daysSinceSowing: number): number {
  if (daysSinceSowing < 0) return FALLOW.kc;
  const c = CROPS[crop];
  const [ini, dev, mid, late] = c.stages;
  const d = daysSinceSowing;
  if (d <= ini) return c.kcIni;
  if (d <= ini + dev) return c.kcIni + ((d - ini) / dev) * (c.kcMid - c.kcIni);
  if (d <= ini + dev + mid) return c.kcMid;
  if (d <= ini + dev + mid + late) return c.kcMid + ((d - ini - dev - mid) / late) * (c.kcEnd - c.kcMid);
  return c.kcEnd;
}

/** Growth stage label for UI. */
export function stageForDay(crop: CropType, daysSinceSowing: number): "fallow" | "initial" | "development" | "mid" | "late" | "harvested" {
  if (daysSinceSowing < 0) return "fallow";
  const [ini, dev, mid, late] = CROPS[crop].stages;
  if (daysSinceSowing <= ini) return "initial";
  if (daysSinceSowing <= ini + dev) return "development";
  if (daysSinceSowing <= ini + dev + mid) return "mid";
  if (daysSinceSowing <= ini + dev + mid + late) return "late";
  return "harvested";
}

/** Crop evapotranspiration ETc = Kc × ET₀ (mm/day). */
export const etc = (kc: number, et0Mm: number) => kc * et0Mm;

/** Effective rainfall (mm) — simple fixed-fraction method. */
export const effectiveRain = (precipMm: number, fraction = DEFAULTS.effectiveRainFraction) => Math.max(0, precipMm) * fraction;

/** Net irrigation need (mm) = max(0, ETc + percolation − effective rain). */
export const netNeedMm = (etcMm: number, effRainMm: number, percolationMm = 0) => Math.max(0, etcMm + percolationMm - effRainMm);

/** Gross irrigation volume (m³) to deliver `netMm` over `areaM2` at a given application efficiency. */
export function grossNeedM3(netMm: number, areaM2: number, efficiency: number): number {
  if (efficiency <= 0) throw new Error("efficiency must be > 0");
  return mmOverAreaToM3(netMm, areaM2) / efficiency;
}
