import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const since = new Date(Date.now() - 7 * 86400000);
  const farms = await prisma.farm.findMany({ where: { isSynthetic: true }, include: { dailyRecords: { where: { date: { gte: since } } }, pumps: true } });
  const by: Record<string, number[][]> = {};
  for (const f of farms) {
    const p = f.dailyRecords.reduce((s, r) => s + (r.pumpedM3 ?? 0), 0);
    const n = f.dailyRecords.reduce((s, r) => s + (r.needM3 ?? 0), 0);
    const h = f.dailyRecords.reduce((s, r) => s + r.actualHours, 0);
    (by[f.cropType] ??= []).push([n ? (p - n) / n * 100 : 0, n / 7, h / 7, p / Math.max(h, 0.1)]);
  }
  for (const [c, rows] of Object.entries(by)) {
    const med = (i: number) => rows.map((r) => r[i]).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
    console.log(c, "n", rows.length, "median overNeed%", med(0).toFixed(0), "need m3/d", med(1).toFixed(0), "hours/d", med(2).toFixed(1), "m3/h", med(3).toFixed(1));
  }
  await prisma.$disconnect();
})();
