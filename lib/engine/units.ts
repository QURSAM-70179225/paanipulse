/** Physical constants and unit conversions. UI uses acres/feet; the engine works in SI. */
export const M2_PER_ACRE = 4046.86;
export const M_PER_FT = 0.3048;
export const L_PER_M3 = 1000;
export const RHO_WATER = 1000; // kg/m³
export const G = 9.81; // m/s²
export const J_PER_KWH = 3.6e6;
export const MJ_PER_KWH = 3.6;

export const acresToM2 = (acres: number) => acres * M2_PER_ACRE;
export const ftToM = (ft: number) => ft * M_PER_FT;
export const m3ToLitres = (m3: number) => m3 * L_PER_M3;
export const litresToM3 = (l: number) => l / L_PER_M3;
/** Depth of water (mm) over an area (m²) → volume (m³). */
export const mmOverAreaToM3 = (mm: number, areaM2: number) => (mm / 1000) * areaM2;
/** Volume (m³) spread over an area (m²) → depth (mm). */
export const m3OverAreaToMm = (m3: number, areaM2: number) => (areaM2 > 0 ? (m3 / areaM2) * 1000 : 0);
export const mjToKwh = (mj: number) => mj / MJ_PER_KWH;

export const roundTo = (x: number, step: number) => Math.round(x / step) * step;
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
