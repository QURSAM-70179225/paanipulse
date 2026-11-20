import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, serverError } from "@/lib/api/http";
import { SoilReadingsSchema, soilBodyToArray } from "@/lib/services/soilIngest";
import { checkFieldFull } from "@/lib/services/fieldFullAlert";
import { autoStopIfFull } from "@/lib/services/pumpControl";

export const dynamic = "force-dynamic";

/**
 * Accepts soil-probe readings as JSON: one reading, an array, or { readings: [...] }.
 * Each reading: { farmId, moisture_pct, timestamp?, temperature_c?, ec_ds_m?, n_mg_kg?, p_mg_kg?, k_mg_kg?, deviceId?, source? }.
 * When TELEMETRY_INGEST_KEY is set, devices and the simulator must send it in the x-ingest-key header.
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
    if (valid.length) {
      await prisma.soilReading.createMany({
        data: valid.map((r) => ({
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
      });
    }
    // Warn the farmer by SMS if water has reached the probe (never blocks or fails ingestion).
    if (valid.length) {
      const newest = new Map<string, Date>();
      for (const r of valid) {
        const t = r.timestamp ?? new Date(now);
        if (!newest.has(r.farmId) || t > newest.get(r.farmId)!) newest.set(r.farmId, t);
      }
      const batches = [...newest].map(([farmId, latestAt]) => ({ farmId, latestAt }));
      await checkFieldFull(batches).catch((e) => console.error("field-full check failed", e));
      await autoStopIfFull(batches).catch((e) => console.error("auto-stop check failed", e));
    }
    return NextResponse.json({ accepted: valid.length, rejected: parsed.data.length - valid.length });
  } catch (err) {
    return serverError(err);
  }
}
