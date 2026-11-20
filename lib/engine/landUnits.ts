/**
 * Pakistani land units (Punjab convention). The app stores land in acres; the farmer sees and enters his own unit.
 * 1 acre = 8 kanal = 160 marla; 1 murabba = 25 acres; 1 ghumaon = 1 acre.
 * Local custom varies in places, so confirm units with the farmer.
 */
export const LAND_UNITS = ["acre", "kanal", "marla", "murabba", "ghumaon"] as const;
export type LandUnit = (typeof LAND_UNITS)[number];

export const ACRES_PER_UNIT: Record<LandUnit, number> = {
  acre: 1,
  kanal: 1 / 8,
  marla: 1 / 160,
  murabba: 25,
  ghumaon: 1,
};

export const isLandUnit = (x: unknown): x is LandUnit => typeof x === "string" && (LAND_UNITS as readonly string[]).includes(x);

export const toAcres = (value: number, unit: LandUnit): number => value * ACRES_PER_UNIT[unit];
export const fromAcres = (acres: number, unit: LandUnit): number => acres / ACRES_PER_UNIT[unit];

/** A number in the farmer's unit, rounded so it reads naturally ("12.5", "100", "0.5"). */
export function areaNumber(acres: number, unit: LandUnit): string {
  const v = fromAcres(acres, unit);
  const decimals = unit === "marla" ? 0 : v >= 100 ? 0 : 1;
  const r = Number(v.toFixed(decimals));
  return Number.isInteger(r) ? String(r) : r.toFixed(decimals);
}

/** Sensible bounds for the typed value in each unit, so a typo cannot become a 500-acre farm by accident. */
export function areaLimits(unit: LandUnit): { min: number; max: number; step: number } {
  return { min: fromAcres(0.5, unit), max: fromAcres(500, unit), step: unit === "marla" ? 1 : unit === "kanal" ? 1 : 0.5 };
}
