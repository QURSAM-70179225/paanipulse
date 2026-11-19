/**
 * Estimating ET0 and sunlight when only temperature, cloud cover and rain are available (backup weather provider).
 * FAO-56: extraterrestrial radiation (eq. 21), Hargreaves-Samani ET0 (eq. 52) and the Angström-Prescott relation (eq. 35).
 * These are ESTIMATES: typically within ~15-25% of the Penman-Monteith ET0 that Open-Meteo provides.
 */

const GSC = 0.082; // solar constant, MJ m-2 min-1

/** Extraterrestrial radiation Ra (MJ m-2 day-1) at latitude `latDeg` on day-of-year `doy`. */
export function extraterrestrialRadiationMj(latDeg: number, doy: number): number {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * doy);
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * doy - 1.39);
  const ws = Math.acos(Math.min(1, Math.max(-1, -Math.tan(phi) * Math.tan(delta))));
  return ((24 * 60) / Math.PI) * GSC * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
}

/** Hargreaves-Samani reference evapotranspiration (mm/day). */
export function hargreavesEt0(tMinC: number, tMaxC: number, latDeg: number, doy: number): number {
  const range = Math.max(0, tMaxC - tMinC);
  const tMean = (tMinC + tMaxC) / 2;
  const raMm = extraterrestrialRadiationMj(latDeg, doy) * 0.408; // MJ m-2 day-1 → mm/day of evaporation
  return Math.max(0, 0.0023 * (tMean + 17.8) * Math.sqrt(range) * raMm);
}

/** Solar radiation at the ground (MJ m-2 day-1) from cloud cover (0 = clear, 1 = overcast): Rs = (0.25 + 0.5·n/N)·Ra. */
export function radiationFromCloudCover(raMj: number, cloudFraction: number): number {
  const sunshineFraction = 1 - Math.min(1, Math.max(0, cloudFraction));
  return (0.25 + 0.5 * sunshineFraction) * raMj;
}
