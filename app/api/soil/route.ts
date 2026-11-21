import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, serverError } from "@/lib/api/http";
import { SoilReadingsSchema, soilBodyToArray } from "@/lib/services/soilIngest";
import { saveSoilReadings } from "@/lib/services/soilStore";

export const dynamic = "force-dynamic";

/**
 * Accepts soil-probe readings as JSON: one reading, an array, or { readings: [...] }.
 * Each reading: { farmId, moisture_pct, timestamp?, temperature_c?, ec_ds_m?, n_mg_kg?, p_mg_kg?, k_mg_kg?, deviceId?, source? }.
 * For the simulator and wired installations. SIM probes use /api/device/soil with their own key.
 * When TELEMETRY_INGEST_KEY is set, callers must send it in the x-ingest-key header.
 */
export async function POST(req: Request) {
  const key = process.env.TELEMETRY_INGEST_KEY;
  if (key && req.headers.get("x-ingest-key") !== key) return NextResponse.json({ error: "invalid ingest key" }, { status: 401 });
  let raw: unknown;
  try {
    raw = soilBodyToArray(await req.json());
  } catch {
    raw = null;
  }
  const parsed = SoilReadingsSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error);

  try {
    const now = Date.now();
    const farmIds = [...new Set(parsed.data.map((r) => r.farmId))];
    const known = await prisma.farm.findMany({ where: { id: { in: farmIds } }, select: { id: true } });
    const knownIds = new Set(known.map((f) => f.id));
    // Drop readings for unknown farms and timestamps more than 10 minutes in the future (bad device clock).
    const valid = parsed.data.filter((r) => knownIds.has(r.farmId) && (r.timestamp?.getTime() ?? now) <= now + 600_000);
    await saveSoilReadings(
      valid.map((r) => ({
        farmId: r.farmId,
        deviceId: r.deviceId,
        timestamp: r.timestamp ?? new Date(now),
        moisturePct: r.moisture_pct,
        temperatureC: r.temperature_c,
        ecDsM: r.ec_ds_m,
        nitrogenMgKg: r.n_mg_kg,
        phosphorusMgKg: r.p_mg_kg,
        potassiumMgKg: r.k_mg_kg,
        source: r.source,
      })),
    );
    return NextResponse.json({ accepted: valid.length, rejected: parsed.data.length - valid.length });
  } catch (err) {
    return serverError(err);
  }
}
