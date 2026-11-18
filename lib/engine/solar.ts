/** Solar geometry + hourly irradiance helpers (pure). */

/** Day of year (1..366) for a UTC date. */
export function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

/** Approximate day length in hours (FAO-56 eq. 34 via sunset hour angle). */
export function dayLengthHours(latDeg: number, doy: number): number {
  const phi = (latDeg * Math.PI) / 180;
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * doy - 1.39);
  const x = Math.min(1, Math.max(-1, -Math.tan(phi) * Math.tan(delta)));
  return (24 / Math.PI) * Math.acos(x);
}

/**
 * Distribute a daily shortwave total (kWh/m²) over 24 local hours with a half-sine centred on solar noon.
 * Returns mean irradiance per hour (W/m²). Used when only daily radiation is available (or for cached data).
 */
export function hourlyGhiFromDaily(dailyKwhPerM2: number, latDeg: number, doy: number, solarNoonLocal = 12.1): number[] {
  const N = dayLengthHours(latDeg, doy);
  const sunrise = solarNoonLocal - N / 2;
  const out = new Array<number>(24).fill(0);
  // Integrate sin over each hour; total ∫ sin(π(t−sr)/N) dt over the day = 2N/π.
  const norm = (2 * N) / Math.PI;
  for (let h = 0; h < 24; h++) {
    const a = Math.max(0, Math.min(N, h - sunrise));
    const b = Math.max(0, Math.min(N, h + 1 - sunrise));
    if (b <= a) continue;
    const frac = ((N / Math.PI) * (Math.cos((Math.PI * a) / N) - Math.cos((Math.PI * b) / N))) / norm;
    out[h] = dailyKwhPerM2 * 1000 * frac; // Wh/m² in that hour == mean W/m²
  }
  return out;
}
