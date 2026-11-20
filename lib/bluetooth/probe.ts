/**
 * Bluetooth Low Energy protocol of the DIY "PaaniProbe" (ESP32 + capacitive soil-moisture sensor), and pure helpers.
 * The same UUIDs are in hardware/esp32-soil-probe/esp32-soil-probe.ino: change them in both places.
 *
 * All values are short UTF-8 text lines so they fit in one BLE notification:
 *   reading  (notify/read): "24.5,1834"   = moisture %, raw sensor value
 *   history  (notify):      "5400,24.5"   = age in seconds, moisture %    …then "END"
 *   control  (write):       "H"           = send the stored history, then clear it
 */
export const PROBE = {
  namePrefix: "PaaniProbe",
  service: "7d3f0001-5a0e-4f6b-9a3c-2b1e6c4d8a10",
  reading: "7d3f0002-5a0e-4f6b-9a3c-2b1e6c4d8a10",
  history: "7d3f0003-5a0e-4f6b-9a3c-2b1e6c4d8a10",
  control: "7d3f0004-5a0e-4f6b-9a3c-2b1e6c4d8a10",
} as const;

export interface ProbeReading {
  moisturePct: number;
  raw: number | null;
}

/** "24.5,1834" → { moisturePct: 24.5, raw: 1834 }. Returns null for anything that is not a plausible reading. */
export function parseReading(text: string): ProbeReading | null {
  const [m, r] = text.trim().split(",");
  const moisturePct = Number(m);
  if (m === undefined || m.trim() === "" || !Number.isFinite(moisturePct) || moisturePct < 0 || moisturePct > 100) return null;
  const raw = r !== undefined && r.trim() !== "" && Number.isFinite(Number(r)) ? Number(r) : null;
  return { moisturePct, raw };
}

export interface HistoryEntry {
  timestamp: Date;
  moisturePct: number;
}

/** "5400,24.5" → the reading taken 5,400 s before `now`; "END" ends the transfer; anything else is ignored (null). */
export function parseHistoryLine(text: string, now: Date): HistoryEntry | "END" | null {
  const t = text.trim();
  if (t === "END") return "END";
  const [age, m] = t.split(",");
  const ageS = Number(age);
  const moisturePct = Number(m);
  if (age === undefined || m === undefined || !Number.isFinite(ageS) || ageS < 0 || ageS > 7 * 86_400 || !Number.isFinite(moisturePct) || moisturePct < 0 || moisturePct > 100) return null;
  return { timestamp: new Date(now.getTime() - ageS * 1000), moisturePct };
}

/** What the browser uploads to POST /api/farms/{id}/soil. */
export interface UploadReading {
  timestamp: string;
  moisture_pct: number;
  deviceId?: string;
  source: "sensor";
}

export const toUpload = (timestamp: Date, moisturePct: number, deviceId?: string): UploadReading => ({
  timestamp: timestamp.toISOString(), moisture_pct: Math.round(moisturePct * 10) / 10, ...(deviceId ? { deviceId: deviceId.slice(0, 64) } : {}), source: "sensor",
});

/** Offline queue: newest readings are kept if it grows past `max`. */
export function enqueue(queue: UploadReading[], items: UploadReading[], max = 500): UploadReading[] {
  const all = [...queue, ...items];
  return all.length > max ? all.slice(all.length - max) : all;
}

/** Live readings arrive every few seconds; upload at most one per `everyMs` (default one a minute). */
export const shouldUpload = (lastUploadAt: number | null, now: number, everyMs = 60_000): boolean => lastUploadAt === null || now - lastUploadAt >= everyMs;
