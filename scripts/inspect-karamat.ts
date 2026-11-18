import { pktDateKey, pktDayStart } from "../lib/dates";
import { simulateFarm, summarise } from "../lib/engine";
import { sampleWeather } from "../lib/services/sampleWeather";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
(async () => {
  const farm = await prisma.farm.findUniqueOrThrow({ where: { id: "karamat" }, include: { pumps: true, dailyRecords: true } });
  const pump = farm.pumps[0];
  const hours = Object.fromEntries(farm.dailyRecords.map((r) => [pktDateKey(r.date), r.actualHours]));
  const res = simulateFarm(
    { crop: farm.cropType as "wheat", sowingDate: pktDateKey(farm.sowingDate), areaAcres: farm.areaAcres, irrigationMethod: "flood", lat: farm.lat, pump },
    sampleWeather(), hours, pktDateKey(pktDayStart(0)),
  );
  console.log("head m", res.headM.toFixed(1), "kWh/m3", res.kwhPerM3.toFixed(3));
  for (const d of res.days.slice(-10)) console.log(d.date, "dss", d.daysSinceSowing, "h", d.actualHours, "pumped", d.pumpedM3.toFixed(0), "need", d.needM3.toFixed(0), "excess", d.excessM3.toFixed(0), "Dr", d.depletionEndMm.toFixed(1), "/RAW", d.rawMm.toFixed(1), "pv", d.pvKwh.toFixed(0), "spare", d.spareKwh.toFixed(0), "rec", d.recommendedHours, "flow", d.flowM3PerHour.toFixed(1));
  console.log("TODAY", res.today);
  console.log("WEEK", summarise(res.days));
  await prisma.$disconnect();
})();
