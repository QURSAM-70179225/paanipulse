/**
 * SIM devices (soil probe, pump control box): claim codes and the compact upload format. Pure, so it is unit-testable.
 *
 * Each device is made with two values:
 *  - a CLAIM CODE printed on the box (PP-7K3Q-9M2X). The farmer types it once in the app to link the device to a farm.
 *  - a SECRET flashed into the firmware. The device sends it with every request; the server stores only its SHA-256.
 */
import { z } from "zod";

/** No 0/O, 1/I/L: easy to read off a sticker and type on a phone. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_BODY = 8;

/** A new claim code from random bytes (pass crypto.getRandomValues or randomBytes). */
export function makeCode(randomBytes: (n: number) => Uint8Array): string {
  const bytes = randomBytes(CODE_BODY);
  const body = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `PP-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** What the farmer typed, in the stored form, or null if it cannot be a code. Accepts lower case, spaces, missing dashes and "PP". */
export function normalizeCode(input: string): string | null {
  let s = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (s.length === CODE_BODY + 2 && s.startsWith("PP")) s = s.slice(2);
  if (s.length !== CODE_BODY) return null;
  if (![...s].every((c) => CODE_ALPHABET.includes(c))) return null;
  return `PP-${s.slice(0, 4)}-${s.slice(4)}`;
}

export const DEVICE_KINDS = ["probe", "pump"] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

/** Networks a device may report. */
export const NETWORKS = ["2G", "3G", "4G"] as const;

const MAX_AGE_S = 7 * 86_400;

/**
 * Probe upload, kept small for slow 2G links. The probe has no clock: each reading carries its AGE in seconds (how long ago it was
 * taken), and the server turns that into a time. Readings stored while the probe had no network arrive later in one batch.
 *   { "n": "2G", "q": 14, "r": [[0, 31.5], [900, 30.8, 24.1], ...] }   // [ageSeconds, moisture %, temperature °C?]
 */
export const ProbeBatchSchema = z.object({
  n: z.enum(NETWORKS).optional(),
  q: z.number().int().min(0).max(99).optional(),
  r: z
    .array(z.tuple([z.number().int().min(0).max(MAX_AGE_S), z.number().min(0).max(100)]).rest(z.number().min(-10).max(70)))
    .min(1)
    .max(300),
});
export type ProbeBatch = z.infer<typeof ProbeBatchSchema>;

export function batchToReadings(b: ProbeBatch, now: Date): { timestamp: Date; moisturePct: number; temperatureC: number | null }[] {
  return b.r.map(([age, pct, temp]) => ({ timestamp: new Date(now.getTime() - age * 1000), moisturePct: pct, temperatureC: temp ?? null }));
}

/** The pump box's check-in: what the relay is doing now, plus the network it is on. */
export const PumpCheckInSchema = z.object({
  on: z.boolean(),
  n: z.enum(NETWORKS).optional(),
  q: z.number().int().min(0).max(99).optional(),
});

/** Signal quality from the modem's CSQ (0–31; 99 = unknown) in three words the farmer can use. */
export function signalWord(q: number | null | undefined): "good" | "fair" | "weak" | null {
  if (q === null || q === undefined || q > 31) return null;
  if (q >= 15) return "good";
  if (q >= 8) return "fair";
  return "weak";
}

/** How often the pump box should check in: faster while it runs, so a stop reaches it quickly. */
export const pollSecondsFor = (on: boolean) => (on ? 15 : 30);
