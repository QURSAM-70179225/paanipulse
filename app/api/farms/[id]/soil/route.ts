import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardFarm, serverError } from "@/lib/api/http";
import { CROPS, crossCheck, depletedFraction, fieldFilled, isFresh, salinityLevel, soilLimits, soilStatus, type CropType } from "@/lib/engine";
import { getFarmState } from "@/lib/services/farmState";

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

