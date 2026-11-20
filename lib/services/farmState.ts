/** Builds the full farm dashboard view model: weather → engine → advice text. Server-only. */
import "server-only";
import { prisma } from "@/lib/db";
import { pktDateKey, pktDayStart } from "@/lib/dates";
import { adviceConfidence, CRITICAL_STAGES, DEFAULTS, flowRangeM3h, pumpOutput, summarise, surplusIdeas, type CropType } from "@/lib/engine";
import { fertHint, fertSchedule, fertTotals, isLandUnit } from "@/lib/engine";
import { advisoryText } from "./advisoryText";
import { parseFertPlan } from "./fertPlan";
import { runFarm } from "./farmSim";
import { getWeather, nextHours } from "./weather";

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
  const yesterdayReported = pktDateKey(pktDayStart(-1, now)) in hours;
  // Offline sample weather is not real data: never let a forecast (sample) rain skip an irrigation.
  const sim = runFarm(farm, pump, hours, weather.days, todayKey, { weatherReliable: weather.source !== "sample" });

  const week = summarise(sim.days, 7);
  const yesterday = sim.days[sim.days.length - 1];
  const advice = sim.today.advice;
  const flowRange = flowRangeM3h(pump, sim.today.peakPumpKw);
  const todayIdx = weather.days.findIndex((d) => d.date === todayKey);
  const forecast = weather.days.slice(todayIdx, todayIdx + 7);

  const stage = advice.stageId ? (CRITICAL_STAGES[farm.cropType as CropType] ?? []).find((st) => st.id === advice.stageId) : undefined;
  const criticalStage = stage ? { ur: stage.labelUr, roman: stage.labelRoman, en: stage.labelEn } : undefined;
  const text = advisoryText({
    crop: farm.cropType as CropType,
    kind: advice.kind,
    hoursToday: advice.hoursToday,
    totalHours: advice.totalHours,
    daysUntilNext: advice.daysUntilNext,
    rainTomorrowMm: forecast[1]?.precipMm ?? 0,
    rainDeclined: advice.rainDeclined,
    waterPlan: advice.kind === "irrigate" ? { grossMm: advice.grossMm, areaAcres: farm.areaAcres, areaUnit: isLandUnit(farm.areaUnit) ? farm.areaUnit : undefined, totalM3: (advice.grossMm / 1000) * sim.areaM2 } : undefined,
    yesterdayHours: yesterday?.actualHours ?? 0,
    yesterdayNeededHours: yesterday?.recommendedHours ?? 0,
    weekUreaKg: week.ureaKg,
    weekSpareKwh: week.spareKwh,
    weekWastedKwh: week.wastedKwh,
    surplusRsPerKwh: DEFAULTS.surplusRsPerKwh,
    criticalStage,
  });

  // On a "pump off" day, the whole day's solar yield is spare.
  const todaySpareKwh = Math.max(0, sim.today.pvKwh - (advice.kind === "irrigate" ? advice.hoursToday * sim.today.peakPumpKw * 0.8 : 0));

  const fertPlan = parseFertPlan(farm.fertPlan);
  const fert = fertPlan
    ? {
        plan: fertPlan,
        totals: fertTotals(fertPlan, farm.areaAcres),
        schedule: fertSchedule(fertPlan, farm.areaAcres),
        // Raw forecast rain for today + tomorrow decides whether a urea dose is held.
        hint: fertHint(fertPlan, farm.areaAcres, advice.kind, (forecast[0]?.precipMm ?? 0) + (forecast[1]?.precipMm ?? 0)),
      }
    : null;

  return {
    fert,
    farm: {
      id: farm.id,
      farmerName: farm.farmerName,
      district: farm.district,
      tehsil: farm.tehsil,
      crop: farm.cropType as CropType,
      areaAcres: farm.areaAcres,
      variety: farm.variety,
      maturity: farm.maturity,
      areaUnit: isLandUnit(farm.areaUnit) ? farm.areaUnit : ("acre" as const),
      irrigationMethod: farm.irrigationMethod,
      isSynthetic: farm.isSynthetic,
      lat: farm.lat,
      lng: farm.lng,
    },
    /** How far to trust today's advice, and why not (shown on the farmer dashboard). */
    confidence: adviceConfidence({
      weatherSource: weather.source,
      pumpCalibrated: pump.calibrated,
      hasTelemetry: pump.hasTelemetry,
      hoursReported: yesterdayReported,
      rainForecastInvolved: !!advice.rainDeclined && advice.rainDeclined !== "weather",
    }),
    /** Open-loop water instruction for this field: depth, volume and hours (set only on an irrigate day). */
    waterPlan: advice.kind === "irrigate"
      ? { netMm: advice.netMm, grossMm: advice.grossMm, acreInches: advice.grossMm / 25.4, areaAcres: farm.areaAcres, totalM3: (advice.grossMm / 1000) * sim.areaM2, hoursToday: advice.hoursToday, totalHours: advice.totalHours }
      : null,
    pump: {
      id: pump.id,
      ratedKw: pump.ratedKw,
      pvKwp: pump.pvKwp,
      staticDepthFt: pump.staticDepthFt,
      efficiency: pump.efficiency,
      calibrated: pump.calibrated,
      hasTelemetry: pump.hasTelemetry,
      controlEnabled: pump.controlEnabled,
    },
    yesterdayReported,
    criticalStage: criticalStage ?? null,
    dataSource: pump.hasTelemetry ? ("telemetry" as const) : ("sunlight" as const),
    weatherSource: weather.source,
    weatherNow: weather.current ?? null,
    weatherHourly: nextHours(weather.hourly, now, 24),
    weatherFetchedAt: weather.fetchedAt,
    today: {
      ...sim.today,
      advice,
      flowRange,
      /** Pump output at midday sun in farmer units (L/min, cusec, area per hour). */
      output: { low: pumpOutput(flowRange.low), mid: pumpOutput(flowRange.mid), high: pumpOutput(flowRange.high), depthMm: DEFAULTS.typicalIrrigationMm },
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
    /** Full simulated history (for the daily job). */
    days: sim.days,
    headM: sim.headM,
    kwhPerM3: sim.kwhPerM3,
    surplusRsPerKwh: DEFAULTS.surplusRsPerKwh,
  };
}

export type FarmState = NonNullable<Awaited<ReturnType<typeof getFarmState>>>;
