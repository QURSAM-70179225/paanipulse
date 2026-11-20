/**
 * Soil types and how much water each holds (total available water, mm per metre of root zone).
 * Typical rounded values, after the ranges in FAO-56 Table 19: they are a starting point. A soil test or an
 * agriculture officer should confirm the farmer's soil. "loam" is the value PaaniPulse always used before soil type existed.
 */
export const SOIL_TYPES = ["sand", "sandy-loam", "loam", "clay"] as const;
export type SoilType = (typeof SOIL_TYPES)[number];

export const SOIL_AWC_MM_PER_M: Record<SoilType, number> = {
  sand: 80,
  "sandy-loam": 120,
  loam: 140,
  clay: 160,
};

export const isSoilType = (x: unknown): x is SoilType => typeof x === "string" && (SOIL_TYPES as readonly string[]).includes(x);

export const awcForSoil = (soil: string | null | undefined): number => (isSoilType(soil) ? SOIL_AWC_MM_PER_M[soil] : SOIL_AWC_MM_PER_M.loam);
