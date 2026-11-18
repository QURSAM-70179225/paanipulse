import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notFound, serverError } from "@/lib/api/http";
import { pktDayStart } from "@/lib/dates";
import { flowM3sFromPower, modeAIntegrate, totalHeadM } from "@/lib/engine";

export const dynamic = "force-dynamic";

/** Live virtual water meter from today's pump-drive telemetry (Mode A). Polled every 5 s by the dashboard. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const pump = await prisma.pump.findFirst({ where: { farmId: id } });
    if (!pump) return notFound("Farm not found");
    if (!pump.hasTelemetry) return NextResponse.json({ hasTelemetry: false });
    const readings = await prisma.telemetryReading.findMany({
      where: { pumpId: pump.id, timestamp: { gte: pktDayStart(0) } },
      orderBy: { timestamp: "asc" },
    });
    const totals = modeAIntegrate(pump, readings.map((r) => ({ timestamp: r.timestamp, powerKw: r.powerKw })));
    const last = readings[readings.length - 1];
    const H = totalHeadM(pump.staticDepthFt, pump.drawdownM);
    return NextResponse.json({
      hasTelemetry: true,
      readings: readings.length,
      todayLitres: Math.round(totals.m3 * 1000),
      todayKwh: +totals.kwh.toFixed(1),
      runHours: +totals.hours.toFixed(2),
      lastPowerKw: last ? +last.powerKw.toFixed(2) : 0,
      lastFrequencyHz: last ? +last.frequencyHz.toFixed(1) : 0,
      lastFlowLph: last ? Math.round(flowM3sFromPower(last.powerKw * 1000, pump.efficiency, H) * 3600 * 1000) : 0,
      lastAt: last?.timestamp.toISOString() ?? null,
      calibrated: pump.calibrated,
    });
  } catch (err) {
    return serverError(err);
  }
}
