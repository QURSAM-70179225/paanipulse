/** Validation for soil-probe readings sent to POST /api/soil (no server-only code, so it is unit-testable). */
import { z } from "zod";

/** Optional number: absent, null and "" all mean "not measured". */
const opt = (min: number, max: number) =>
  z.preprocess((v) => (v === null || v === "" ? undefined : v), z.coerce.number().min(min).max(max).optional());

export const SoilReadingSchema = z.object({
  farmId: z.string().min(1).max(64),
  deviceId: z.string().max(64).optional(),
  /** Defaults to "now" on the server when a device has no clock. */
  timestamp: z.preprocess((v) => (v === null || v === "" ? undefined : v), z.coerce.date().optional()),
  /** Volumetric water content, percent. */
  moisture_pct: z.coerce.number().min(0).max(100),
  temperature_c: opt(-10, 70),
  /** Bulk electrical conductivity, dS/m. */
  ec_ds_m: opt(0, 20),
  n_mg_kg: opt(0, 5000),
  p_mg_kg: opt(0, 5000),
  k_mg_kg: opt(0, 5000),
  source: z.enum(["sensor", "simulator", "manual"]).default("sensor"),
});
export const SoilReadingsSchema = z.array(SoilReadingSchema).min(1).max(1000);
export type SoilReadingInput = z.infer<typeof SoilReadingSchema>;

/** Accepts a single reading, an array, or { readings: [...] }. */
export function soilBodyToArray(body: unknown): unknown {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && "readings" in body) return (body as { readings: unknown }).readings;
  return body && typeof body === "object" ? [body] : body;
}
