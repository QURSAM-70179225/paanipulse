import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, guardFarm, serverError } from "@/lib/api/http";
import { SoilReadingSchema, soilBodyToArray } from "@/lib/services/soilIngest";
import { CROPS, crossCheck, depletedFraction, fieldFilled, isFresh, salinityLevel, soilLimits, soilStatus, type CropType } from "@/lib/engine";
import { getFarmState } from "@/lib/services/farmState";
import { checkFieldFull } from "@/lib/services/fieldFullAlert";

export const dynamic = "force-dynamic";

/** Latest soil-probe reading, the last 24 h of moisture, and a cross-check against the water-balance model. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  try {
    const now = new Date();
    const readings = await prisma.soilReading.findMany({
      where: { farmId: id, timestamp: { gte: new Date(now.getTime() - 24 * 3_600_000), lte: new Date(now.getTime() + 600_000) } },
      orderBy: { timestamp: "asc" },
      take: 500,
    });
    const last = readings[readings.length - 1];
    if (!last) return NextResponse.json({ hasData: false });

    const limits = soilLimits();
    const state = await getFarmState(id, now);
    const p = CROPS[(state?.farm.crop ?? "wheat") as CropType].p;
    const sensorFraction = depletedFraction(last.moisturePct, limits);
    const modelFraction = state && state.today.tawMm > 0 ? Math.min(1, state.today.depletionStartMm / state.today.tawMm) : null;
    const fresh = isFresh(last.timestamp, now);
    return NextResponse.json({
      hasData: true,
      latest: {
        at: last.timestamp.toISOString(),
        moisturePct: +last.moisturePct.toFixed(1),
        temperatureC: last.temperatureC,
        ecDsM: last.ecDsM,
        nitrogenMgKg: last.nitrogenMgKg,
        phosphorusMgKg: last.phosphorusMgKg,
        potassiumMgKg: last.potassiumMgKg,
        source: last.source,
      },
      ageMinutes: Math.max(0, Math.round((now.getTime() - last.timestamp.getTime()) / 60_000)),
      fresh,
      sensorFraction: +sensorFraction.toFixed(2),
      modelFraction: modelFraction === null ? null : +modelFraction.toFixed(2),
      status: soilStatus(sensorFraction, p),
      // Water has reached the probe: a farmer who is away can go and switch the pump off (see fieldFull.ts).
      filled: fieldFilled(readings.map((r) => ({ at: r.timestamp, pct: r.moisturePct })), now, limits).filled,
      // Only compare a fresh reading with the model.
      check: fresh && modelFraction !== null ? crossCheck(modelFraction, sensorFraction) : null,
      salinity: last.ecDsM == null ? null : salinityLevel(last.ecDsM),
      readyFraction: p,
      limits,
      series: readings.map((r) => ({ t: r.timestamp.toISOString(), m: +r.moisturePct.toFixed(1) })),
    });
  } catch (err) {
    return serverError(err);
  }
}

const BrowserReadings = z.array(SoilReadingSchema.omit({ farmId: true })).min(1).max(500);

/**
 * Readings uploaded from the signed-in farmer's own phone (for example, relayed from a Bluetooth probe).
 * The farm comes from the URL and the session, so no ingest key is needed in the browser.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  const parsed = BrowserReadings.safeParse(soilBodyToArray(await req.json().catch(() => null)));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const now = Date.now();
    // Drop timestamps more than 10 minutes in the future (a wrong phone or device clock).
    const valid = parsed.data.filter((r) => (r.timestamp?.getTime() ?? now) <= now + 600_000);
    if (valid.length) {
      await prisma.soilReading.createMany({
        data: valid.map((r) => ({
          farmId: id,
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
    if (valid.length) {
      const latestAt = valid.reduce((m, r) => { const t = r.timestamp ?? new Date(now); return t > m ? t : m; }, new Date(0));
      await checkFieldFull([{ farmId: id, latestAt }]).catch((e) => console.error("field-full check failed", e));
    }
    return NextResponse.json({ accepted: valid.length, rejected: parsed.data.length - valid.length });
  } catch (err) {
    return serverError(err);
  }
}
