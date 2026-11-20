/**
 * Day-by-day farm simulation: runs the water balance over history (actual pump hours)
 * and produces today's advice from the forecast. Pure — weather and hours are passed in.
 */
import { CRITICAL_STAGES, CROPS, DEFAULTS, IRRIGATION_EFFICIENCY, type CropType, type IrrigationMethod } from "./config";
import { effectiveRain, etc as etcOf, kcForDay, netNeedMm, stageForDay } from "./cropWater";
import { adviseFlooded, adviseFromBalance, type Advice } from "./advice";
import { kwhPerM3, modeBDay, totalHeadM, type PumpSpec } from "./pump";
import { leachedNKg, ureaEquivalent, wastedKwh } from "./savings";
import { dayOfYear, hourlyGhiFromDaily } from "./solar";
import { acresToM2, m3OverAreaToMm, mmOverAreaToM3, mjToKwh } from "./units";
import { awcForSoil } from "./soils";
import { maturityScale } from "./varieties";
import { balanceStep, rawMm, rootDepthM, tawMm } from "./waterBalance";

export interface WeatherDay {
  /** "YYYY-MM-DD" local date. */
  date: string;
  et0Mm: number;
  precipMm: number;
  /** Daily shortwave radiation (MJ/m²) — Open-Meteo shortwave_radiation_sum. */
  radiationMj: number;
  /** Optional hourly GHI (W/m², 24 values, local hours). Derived from the daily total if absent. */
  hourlyGhi?: number[];
  tMax?: number;
  tMin?: number;
}

export interface FarmInput {
  crop: CropType;
  /** "YYYY-MM-DD" sowing date. */
  sowingDate: string;
  areaAcres: number;
  irrigationMethod: IrrigationMethod;
  /** Soil type: sets how much water the root zone holds. Absent = loam (the original fixed value). */
  soilType?: string;
  /** "normal" | "early" | "late": a shorter- or longer-duration variety. Absent = normal (the typical crop). */
  maturity?: string;
  lat: number;
  pump: PumpSpec;
}

export interface DayResult {
  date: string;
  daysSinceSowing: number;
  stage: ReturnType<typeof stageForDay>;
  kc: number;
  et0: number;
  etc: number;
  rainMm: number;
  effRainMm: number;
  tawMm: number;
  rawMm: number;
  depletionStartMm: number;
  depletionEndMm: number;
  actualHours: number;
  pumpedM3: number;
  pumpKwh: number;
  pvKwh: number;
  spareKwh: number;
  /** Gross-equivalent crop water use that day (m³). */
  needM3: number;
  /** Gross-equivalent water lost below the root zone because of over-irrigation (m³). */
  excessM3: number;
  wastedKwh: number;
  deepPercolationMm: number;
  leachedNKg: number;
  recommendedHours: number;
  flowM3PerHour: number;
  pumpableHours: number;
}

export interface SimulationResult {
  days: DayResult[];
  today: {
    date: string;
    advice: Advice;
    depletionStartMm: number;
    rawMm: number;
    tawMm: number;
    pvKwh: number;
    pumpableHours: number;
    stage: DayResult["stage"];
    daysSinceSowing: number;
    et0: number;
    etc: number;
    rainMm: number;
    effRainMm: number;
    /** Gross-equivalent crop water use today (m³). */
    needM3: number;
    /** Peak pump input power today (kW) — used for the flow range. */
    peakPumpKw: number;
  };
  headM: number;
  kwhPerM3: number;
  areaM2: number;
  irrigationEfficiency: number;
}

const dateUtc = (key: string) => new Date(`${key}T00:00:00Z`);
const dayDiff = (a: string, b: string) => Math.round((dateUtc(b).getTime() - dateUtc(a).getTime()) / 86_400_000);

/**
 * @param weather history + today + forecast, ordered by date.
 * @param actualHours map date → pump hours actually run (history only).
 * @param todayKey the local date treated as "today".
 * @param initialDepletionFraction depletion at the first simulated day as a fraction of TAW (0 = field capacity, e.g. after a rice crop).
 */
export function simulateFarm(
  farm: FarmInput,
  weather: WeatherDay[],
  actualHours: Record<string, number>,
  todayKey: string,
  initialDepletionFraction = 0,
  opts: { weatherReliable?: boolean } = {},
): SimulationResult {
  const crop = CROPS[farm.crop];
  const sc = maturityScale(farm.maturity);
  const areaM2 = acresToM2(farm.areaAcres);
  const eff = IRRIGATION_EFFICIENCY[farm.irrigationMethod];
  const headM = totalHeadM(farm.pump.staticDepthFt, farm.pump.drawdownM);
  const kpm = kwhPerM3(headM, farm.pump.efficiency ?? DEFAULTS.efficiency);
  const todayIdx = weather.findIndex((w) => w.date === todayKey);
  if (todayIdx < 0) throw new Error(`today ${todayKey} not in weather series`);

  const perDay = weather.map((w) => {
    const dss = dayDiff(farm.sowingDate, w.date);
    const kc = kcForDay(farm.crop, dss, sc);
    const etcMm = etcOf(kc, w.et0Mm);
    const effRainMm = effectiveRain(w.precipMm);
    const taw = tawMm(rootDepthM(farm.crop, dss, undefined, sc), awcForSoil(farm.soilType));
    const raw = rawMm(taw, dss < 0 ? 0.5 : crop.p);
    const ghi = w.hourlyGhi ?? hourlyGhiFromDaily(mjToKwh(w.radiationMj), farm.lat, dayOfYear(dateUtc(w.date)));
    const solar = modeBDay(farm.pump, ghi);
    const flooded = !!crop.flooded && dss >= 0;
    const percolation = flooded ? DEFAULTS.ricePercolationMm : 0;
    return { w, dss, kc, etcMm, effRainMm, taw, raw, solar, flooded, percolation };
  });

  const adviseAt = (i: number, depletionStart: number): Advice => {
    const d = perDay[i];
    const tomorrow = perDay[i + 1];
    const effRainTomorrowMm = tomorrow ? tomorrow.effRainMm : 0;
    const typicalHours = Math.max(1, Math.min(8, d.solar.pumpableHours));
    const flow = d.solar.flowForHours(typicalHours);
    if (d.flooded) {
      return adviseFlooded({
        netNeedTodayMm: netNeedMm(d.etcMm, d.effRainMm, d.percolation),
        effRainTomorrowMm,
        areaM2,
        irrigationEfficiency: eff,
        flowM3PerHour: flow,
        hoursAvailableToday: d.solar.pumpableHours,
        weatherReliable: opts.weatherReliable,
      });
    }
    const horizon = perDay.slice(i, i + 7).map((x) => x.etcMm - x.effRainMm);
    // Next critical stage that hasn't ended yet (e.g. wheat CRI at 20–25 days after sowing).
    const stage = (CRITICAL_STAGES[farm.crop] ?? []).find((st) => d.dss <= st.toDay);
    const critical = stage && d.dss >= 0
      ? { id: stage.id, startInDays: stage.fromDay - d.dss, endInDays: stage.toDay - d.dss, minDepletionMm: stage.minDepletionFraction * d.taw }
      : undefined;
    return adviseFromBalance({
      depletionStartMm: depletionStart,
      rawMm: d.raw,
      forecastNetUseMm: horizon,
      effRainTomorrowMm,
      areaM2,
      irrigationEfficiency: eff,
      flowM3PerHour: flow,
      hoursAvailableToday: d.solar.pumpableHours,
      fallbackNetUseMm: d.etcMm,
      critical,
      tawMm: d.taw,
      weatherReliable: opts.weatherReliable,
    });
  };

  const days: DayResult[] = [];
  let dr = perDay[0] ? perDay[0].taw * initialDepletionFraction : 0;
  for (let i = 0; i < todayIdx; i++) {
    const d = perDay[i];
    const advice = adviseAt(i, dr);
    const hours = actualHours[d.w.date] ?? 0;
    const run = d.solar.runHours(hours);
    const netIrrMm = m3OverAreaToMm(run.m3, areaM2) * eff;
    let needM3: number;
    let excessM3: number;
    let deepMm: number;
    const depletionStart = dr;
    if (d.flooded) {
      const needNet = netNeedMm(d.etcMm, d.effRainMm, d.percolation);
      needM3 = mmOverAreaToM3(needNet, areaM2) / eff;
      excessM3 = Math.max(0, run.m3 - needM3);
      deepMm = m3OverAreaToMm(excessM3, areaM2) * eff;
      dr = 0;
    } else {
      needM3 = mmOverAreaToM3(Math.max(0, d.etcMm - d.effRainMm), areaM2) / eff;
      const step = balanceStep(dr, d.etcMm, d.effRainMm, netIrrMm, d.taw);
      dr = step.depletionMm;
      deepMm = step.deepPercolationMm;
      // Only the part of deep percolation caused by pumping counts as over-pumping.
      const fromIrrigationMm = Math.min(deepMm, netIrrMm);
      excessM3 = mmOverAreaToM3(fromIrrigationMm, areaM2) / eff;
    }
    days.push({
      date: d.w.date,
      daysSinceSowing: d.dss,
      stage: stageForDay(farm.crop, d.dss, sc),
      kc: d.kc,
      et0: d.w.et0Mm,
      etc: d.etcMm,
      rainMm: d.w.precipMm,
      effRainMm: d.effRainMm,
      tawMm: d.taw,
      rawMm: d.raw,
      depletionStartMm: depletionStart,
      depletionEndMm: dr,
      actualHours: hours,
      pumpedM3: run.m3,
      pumpKwh: run.kwh,
      pvKwh: d.solar.pvKwh,
      spareKwh: Math.max(0, d.solar.pvKwh - run.kwh),
      needM3,
      excessM3,
      wastedKwh: wastedKwh(excessM3, kpm),
      deepPercolationMm: deepMm,
      leachedNKg: leachedNKg(deepMm, areaM2),
      recommendedHours: advice.hoursToday,
      flowM3PerHour: advice.flowM3PerHour,
      pumpableHours: d.solar.pumpableHours,
    });
  }

  const t = perDay[todayIdx];
  return {
    days,
    today: {
      date: t.w.date,
      advice: adviseAt(todayIdx, dr),
      depletionStartMm: dr,
      rawMm: t.raw,
      tawMm: t.taw,
      pvKwh: t.solar.pvKwh,
      pumpableHours: t.solar.pumpableHours,
      stage: stageForDay(farm.crop, t.dss, sc),
      daysSinceSowing: t.dss,
      et0: t.w.et0Mm,
      etc: t.etcMm,
      rainMm: t.w.precipMm,
      effRainMm: t.effRainMm,
      needM3: mmOverAreaToM3(Math.max(0, t.etcMm - t.effRainMm + t.percolation), areaM2) / eff,
      peakPumpKw: t.solar.peakPumpKw,
    },
    headM,
    kwhPerM3: kpm,
    areaM2,
    irrigationEfficiency: eff,
  };
}

/** Totals over the last `n` simulated days (for weekly savings cards). */
export function summarise(days: DayResult[], n = 7) {
  const last = days.slice(-n);
  const sum = (k: keyof DayResult) => last.reduce((s, d) => s + (d[k] as number), 0);
  const pumpedM3 = sum("pumpedM3");
  const needM3 = sum("needM3");
  const excessM3 = sum("excessM3");
  const nKg = sum("leachedNKg");
  const urea = ureaEquivalent(nKg);
  return {
    days: last.length,
    pumpedM3,
    needM3,
    excessM3,
    excessPct: pumpedM3 > 0 ? (excessM3 / pumpedM3) * 100 : 0,
    overNeedPct: needM3 > 0 ? ((pumpedM3 - needM3) / needM3) * 100 : 0,
    actualHours: sum("actualHours"),
    recommendedHours: sum("recommendedHours"),
    wastedKwh: sum("wastedKwh"),
    spareKwh: sum("spareKwh"),
    pvKwh: sum("pvKwh"),
    leachedNKg: nKg,
    ureaKg: urea.kg,
    ureaRs: urea.rs,
  };
}
