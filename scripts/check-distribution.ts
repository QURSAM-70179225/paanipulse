import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const since = new Date(Date.now() - 7 * 86400000);
  const farms = await prisma.farm.findMany({ include: { dailyRecords: { where: { date: { gte: since } } } } });
  const rows = farms.map((f) => {
    const p = f.dailyRecords.reduce((s, r) => s + (r.pumpedM3 ?? 0), 0);
    const n = f.dailyRecords.reduce((s, r) => s + (r.needM3 ?? 0), 0);
    const e = f.dailyRecords.reduce((s, r) => s + (r.excessM3 ?? 0), 0);
    return { id: f.id, crop: f.cropType, district: f.district, overNeed: n ? (p - n) / n * 100 : 0, excessPct: p ? e / p * 100 : 0, p };
  });
  const syn = rows.filter((r) => r.id !== "karamat");
  const q = (arr: number[], k: number) => arr.sort((a, b) => a - b)[Math.floor(k * (arr.length - 1))];
  const ex = syn.map((r) => r.excessPct);
  console.log("excess% of pumped  min/p25/median/p75/max:", [0, .25, .5, .75, 1].map((k) => q([...ex], k).toFixed(0)).join(" / "));
  const on = syn.map((r) => r.overNeed);
  console.log("pumped vs need %   min/p25/median/p75/max:", [0, .25, .5, .75, 1].map((k) => q([...on], k).toFixed(0)).join(" / "));
  console.log(">30% excess wells:", syn.filter((r) => r.excessPct > 30).length, "of", syn.length);
  console.log("zero-pumping farms (7d):", syn.filter((r) => r.p === 0).length);
  console.log("karamat:", rows.find((r) => r.id === "karamat"));
  await prisma.$disconnect();
})();
