/** Field validation of the virtual meter against real drum/bucket measurements. Server-only. */
import "server-only";
import { prisma } from "@/lib/db";
import { flowM3sFromPower, totalHeadM } from "@/lib/engine";
import { pumpKwAtHour } from "./pumpPower";

export async function addFieldCheck(farmId: string, input: { hour: number; volumeL: number; seconds: number; inverterKw?: number | null; note?: string | null }) {
  const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId }, include: { pumps: true } });
  const pump = farm.pumps[0];
  const measuredLph = (input.volumeL / input.seconds) * 3600;
  let powerKw = input.inverterKw ?? 0;
  let powerSource: "inverter" | "sunlight" = "inverter";
  if (!powerKw) {
    powerKw = (await pumpKwAtHour(farm.lat, farm.lng, pump, input.hour)).pumpKw;
    powerSource = "sunlight";
  }
  if (powerKw <= 0) throw new Error("no-power-at-hour");
  const H = totalHeadM(pump.staticDepthFt, pump.drawdownM);
  const predictedLph = flowM3sFromPower(powerKw * 1000, pump.efficiency, H) * 3600 * 1000;
  const errorPct = ((predictedLph - measuredLph) / measuredLph) * 100;
  return prisma.fieldCheck.create({
    data: {
      farmId, hour: input.hour, volumeL: input.volumeL, seconds: input.seconds, inverterKw: input.inverterKw ?? null,
      measuredLph, predictedLph, powerSource, errorPct, calibrated: pump.calibrated, note: input.note ?? null,
    },
  });
}

export async function fieldCheckSummary(farmId: string) {
  const checks = await prisma.fieldCheck.findMany({ where: { farmId }, orderBy: { takenAt: "desc" }, take: 20 });
  const mae = (xs: typeof checks) => (xs.length ? xs.reduce((a, c) => a + Math.abs(c.errorPct), 0) / xs.length : null);
  return {
    checks,
    count: checks.length,
    meanAbsErrorPct: mae(checks),
    beforeCalibration: mae(checks.filter((c) => !c.calibrated)),
    afterCalibration: mae(checks.filter((c) => c.calibrated)),
  };
}
