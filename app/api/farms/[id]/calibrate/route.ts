import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, notFound, serverError } from "@/lib/api/http";
import { calibrateEfficiency, DEFAULTS, flowRangeM3h } from "@/lib/engine";
import { pumpKwAtHour } from "@/lib/services/pumpPower";

export const dynamic = "force-dynamic";

const Body = z.union([
  z.object({
    /** Container volume in litres (e.g. a 200 L drum). */
    volumeL: z.number().min(10).max(2000),
    /** Seconds to fill it. */
    seconds: z.number().min(1).max(3600),
    /** Local hour of the test (6–18). Pump power at that hour is taken from the sunlight model or telemetry. */
    hour: z.number().int().min(6).max(18),
  }),
  z.object({ reset: z.literal(true) }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const farm = await prisma.farm.findUnique({ where: { id }, include: { pumps: true } });
    const pump = farm?.pumps[0];
    if (!farm || !pump) return notFound("Farm not found");
    const before = { efficiency: pump.efficiency, calibrated: pump.calibrated };

    if ("reset" in parsed.data) {
      const p = await prisma.pump.update({ where: { id: pump.id }, data: { efficiency: DEFAULTS.efficiency, calibrated: false } });
      return NextResponse.json({ before, after: { efficiency: p.efficiency, calibrated: p.calibrated } });
    }

    const { volumeL, seconds, hour } = parsed.data;
    // Prefer telemetry power near that hour today; otherwise the sunlight model.
    let powerKw = 0;
    if (pump.hasTelemetry) {
      const last = await prisma.telemetryReading.findFirst({ where: { pumpId: pump.id }, orderBy: { timestamp: "desc" } });
      powerKw = last?.powerKw ?? 0;
    }
    if (powerKw <= 0) powerKw = (await pumpKwAtHour(farm.lat, farm.lng, pump, hour)).pumpKw;
    if (powerKw <= 0) {
      return NextResponse.json({ error: "The pump would not be running at that hour (not enough sun). Do the test around midday." }, { status: 422 });
    }
    const efficiency = calibrateEfficiency({ volumeL, seconds, powerKw, staticDepthFt: pump.staticDepthFt, drawdownM: pump.drawdownM });
    const p = await prisma.pump.update({ where: { id: pump.id }, data: { efficiency, calibrated: true } });
    return NextResponse.json({
      powerKw,
      measuredLitresPerHour: Math.round((volumeL / seconds) * 3600),
      before,
      after: { efficiency: p.efficiency, calibrated: p.calibrated },
      flowRangeBefore: flowRangeM3h({ ...pump, calibrated: before.calibrated }, powerKw),
      flowRangeAfter: flowRangeM3h({ ...pump, efficiency, calibrated: true }, powerKw),
    });
  } catch (err) {
    return serverError(err);
  }
}
