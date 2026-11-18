/** Builds the full farm dashboard view model: weather → engine → advice text. Server-only. */
import "server-only";
import { prisma } from "@/lib/db";
import { pktDateKey, pktDayStart } from "@/lib/dates";
import { DEFAULTS, flowRangeM3h, summarise, surplusIdeas, type CropType } from "@/lib/engine";
import { advisoryText } from "./advisoryText";
import { runFarm } from "./farmSim";
import { getWeather } from "./weather";

export async function getFarmState(farmId: string, now: Date = new Date()) {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    include: { pumps: true, dailyRecords: { orderBy: { date: "asc" } } },
  });
  if (!farm || farm.pumps.length === 0) return null;
  const pump = farm.pumps[0];

  const weather = await getWeather(farm.lat, farm.lng, { now });
  const todayKey = pktDateKey(pktDayStart(0, now));
  const hours = Object.fromEntries(farm.dailyRecords.map((r) => [pktDateKey(r.date), r.actualHours]));
  const sim = runFarm(farm, pump, hours, weather.days, todayKey);

  const week = summarise(sim.days, 7);
  const yesterday = sim.days[sim.days.length - 1];
  const advice = sim.today.advice;
  const flowRange = flowRangeM3h(pump, sim.today.peakPumpKw);
  const todayIdx = weather.days.findIndex((d) => d.date === todayKey);
  const forecast = weather.days.slice(todayIdx, todayIdx + 7);

  const text = advisoryText({
    crop: farm.cropType as CropType,
    kind: advice.kind,
    hoursToday: advice.hoursToday,
    totalHours: advice.totalHours,
    daysUntilNext: advice.daysUntilNext,
    rainTomorrowMm: forecast[1]?.precipMm ?? 0,
    yesterdayHours: yesterday?.actualHours ?? 0,
    yesterdayNeededHours: yesterday?.recommendedHours ?? 0,
    weekUreaKg: week.ureaKg,
    weekSpareKwh: week.spareKwh,
    weekWastedKwh: week.wastedKwh,
    surplusRsPerKwh: DEFAULTS.surplusRsPerKwh,
  });

  // On a "pump off" day, the whole day's solar yield is spare.
  const todaySpareKwh = Math.max(0, sim.today.pvKwh - (advice.kind === "irrigate" ? advice.hoursToday * sim.today.peakPumpKw * 0.8 : 0));

  return {
    farm: {
      id: farm.id,
      farmerName: farm.farmerName,
      district: farm.district,
      tehsil: farm.tehsil,
      crop: farm.cropType as CropType,
      areaAcres: farm.areaAcres,
      irrigationMethod: farm.irrigationMethod,
      isSynthetic: farm.isSynthetic,
      lat: farm.lat,
      lng: farm.lng,
    },
    pump: {
      id: pump.id,
      ratedKw: pump.ratedKw,
      pvKwp: pump.pvKwp,
      staticDepthFt: pump.staticDepthFt,
      efficiency: pump.efficiency,
      calibrated: pump.calibrated,
      hasTelemetry: pump.hasTelemetry,
    },
    dataSource: pump.hasTelemetry ? ("telemetry" as const) : ("sunlight" as const),
    weatherSource: weather.source,
    weatherFetchedAt: weather.fetchedAt,
    today: {
      ...sim.today,
      advice,
      flowRange,
      /** Water the crop itself uses today (m³, net — not including irrigation losses). */
      cropUseM3: (sim.today.etc / 1000) * sim.areaM2,
      todaySpareKwh,
      todaySpareIdeas: surplusIdeas(todaySpareKwh),
    },
    yesterday: yesterday
      ? { date: yesterday.date, actualHours: yesterday.actualHours, neededHours: yesterday.recommendedHours, pumpedM3: yesterday.pumpedM3, needM3: yesterday.needM3 }
      : null,
    week,
    chart: sim.days.slice(-7).map((d) => ({
      date: d.date,
      pumpedM3: Math.round(d.pumpedM3),
      needM3: Math.round(d.needM3),
      excessM3: Math.round(d.excessM3),
      actualHours: d.actualHours,
      recommendedHours: d.recommendedHours,
    })),
    forecast: forecast.map((d) => ({ date: d.date, tMax: d.tMax ?? null, tMin: d.tMin ?? null, precipMm: d.precipMm, et0Mm: d.et0Mm })),
    advisory: text,
    headM: sim.headM,
    kwhPerM3: sim.kwhPerM3,
    surplusRsPerKwh: DEFAULTS.surplusRsPerKwh,
  };
}

export type FarmState = NonNullable<Awaited<ReturnType<typeof getFarmState>>>;
