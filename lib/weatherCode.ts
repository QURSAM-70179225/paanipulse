/** WMO weather codes (as returned by Open-Meteo) → a small set of conditions the UI can label and draw. */
export type Condition = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "storm" | "snow";

export function conditionFor(code: number | null | undefined): Condition | null {
  if (code === null || code === undefined) return null;
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 95) return "storm";
  return null;
}
