/** Installer portal data: farms an installer looks after, with a 7-day status. Server-only. */
import "server-only";
import { prisma } from "@/lib/db";

export async function getInstallerFarms(installerId: string) {
  const latest = await prisma.dailyRecord.findFirst({ where: { pumpedM3: { not: null } }, orderBy: { date: "desc" }, select: { date: true } });
  const since = new Date((latest?.date ?? new Date()).getTime() - 6 * 86_400_000);
  const farms = await prisma.farm.findMany({
    where: { installerId },
    orderBy: [{ isSynthetic: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, farmerName: true, district: true, tehsil: true, cropType: true, areaAcres: true, isSynthetic: true,
      owner: { select: { phone: true } },
      pumps: { select: { ratedKw: true, calibrated: true, hasTelemetry: true } },
      dailyRecords: { where: { date: { gte: since }, pumpedM3: { not: null } }, select: { pumpedM3: true, excessM3: true, wastedKwh: true } },
    },
  });
  const rows = farms.map((f) => {
    const pumped = f.dailyRecords.reduce((a, r) => a + (r.pumpedM3 ?? 0), 0);
    const excess = f.dailyRecords.reduce((a, r) => a + (r.excessM3 ?? 0), 0);
    return {
      id: f.id,
      farmerName: f.farmerName,
      phoneMasked: f.owner?.phone ? `${f.owner.phone.slice(0, 4)}•••${f.owner.phone.slice(-3)}` : null,
      district: f.district,
      tehsil: f.tehsil,
      crop: f.cropType,
      areaAcres: f.areaAcres,
      synthetic: f.isSynthetic,
      ratedKw: f.pumps[0]?.ratedKw ?? 0,
      calibrated: !!f.pumps[0]?.calibrated,
      telemetry: !!f.pumps[0]?.hasTelemetry,
      hasData: f.dailyRecords.length > 0,
      lostPct: pumped > 0 ? (excess / pumped) * 100 : 0,
      wastedKwh: f.dailyRecords.reduce((a, r) => a + (r.wastedKwh ?? 0), 0),
    };
  });
  return {
    rows,
    kpis: {
      farms: rows.length,
      overPumping: rows.filter((r) => r.lostPct > 30).length,
      calibrated: rows.filter((r) => r.calibrated).length,
      connected: rows.filter((r) => r.telemetry).length,
    },
  };
}
