/** Well report for lenders, installers and farmers. Server-only. */
import "server-only";
import { DEFAULTS, ureaEquivalent } from "@/lib/engine";
import { farmRef } from "./authority";
import { getFarmState } from "./farmState";
import { fieldCheckSummary } from "./fieldCheck";

export async function getWellReport(farmId: string, opts: { anonymise: boolean; days?: number }) {
  const s = await getFarmState(farmId);
  if (!s) return null;
  const n = opts.days ?? 30;
  const days = s.days.slice(-n);
  const sum = (k: keyof (typeof days)[number]) => days.reduce((a, d) => a + (d[k] as number), 0);
  const pumped = sum("pumpedM3");
  const need = sum("needM3");
  const excess = sum("excessM3");
  const energyUsed = sum("pumpKwh");
  const solar = sum("pvKwh");
  const spare = sum("spareKwh");
  const wasted = sum("wastedKwh");
  const nKg = sum("leachedNKg");
  const lostPct = pumped > 0 ? (excess / pumped) * 100 : 0;
  const half = Math.floor(days.length / 2);
  const lostShare = (xs: typeof days) => {
    const p = xs.reduce((a, d) => a + d.pumpedM3, 0);
    return p > 0 ? (xs.reduce((a, d) => a + d.excessM3, 0) / p) * 100 : 0;
  };
  const trendDelta = lostShare(days.slice(half)) - lostShare(days.slice(0, half));
  const pumpedDays = days.filter((d) => d.actualHours > 0).length;
  const noDataDays = Math.max(0, n - days.length);
  const monthFactor = 30 / Math.max(1, days.length);

  return {
    ref: farmRef(s.farm.id, s.farm.district),
    farm: {
      name: opts.anonymise ? null : s.farm.farmerName,
      district: s.farm.district,
      tehsil: opts.anonymise ? null : s.farm.tehsil,
      crop: s.farm.crop,
      areaAcres: s.farm.areaAcres,
      synthetic: s.farm.isSynthetic,
    },
    pump: { ratedKw: s.pump.ratedKw, pvKwp: s.pump.pvKwp, calibrated: s.pump.calibrated, source: s.dataSource },
    period: { days: days.length, from: days[0]?.date ?? null, to: days[days.length - 1]?.date ?? null },
    asset: { pumpedDays, runHours: sum("actualHours"), energyUsedKwh: energyUsed, solarKwh: solar, utilisationPct: solar > 0 ? (energyUsed / solar) * 100 : 0 },
    water: { pumpedM3: pumped, needM3: need, excessM3: excess, lostPct, trendDelta },
    income: {
      spareKwh: spare,
      spareRsPerMonth: spare * monthFactor * DEFAULTS.surplusRsPerKwh,
      wastedKwh: wasted,
      wastedRsPerMonth: wasted * monthFactor * DEFAULTS.surplusRsPerKwh,
      ureaKg: ureaEquivalent(nKg).kg,
      ureaRs: ureaEquivalent(nKg).rs,
    },
    score: Math.round(Math.max(0, Math.min(100, 100 - lostPct))),
    flags: { overPumping: lostPct > 30, uncalibrated: !s.pump.calibrated, noDataDays },
    weatherSource: s.weatherSource,
    fieldChecks: await fieldCheckSummary(farmId).then((f) => ({ count: f.count, meanAbsErrorPct: f.meanAbsErrorPct })),
  };
}
export type WellReport = NonNullable<Awaited<ReturnType<typeof getWellReport>>>;
