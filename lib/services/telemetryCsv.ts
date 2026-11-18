/** Parse "pumpId,timestamp,power_kw,frequency_hz" CSV (header row required). */
export function parseTelemetryCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split(",").map((h) => h.trim()) ?? [];
  return lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v.trim()])));
}
