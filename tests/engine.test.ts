import { describe, expect, it } from "vitest";
import {
  acresToM2, adviceConfidence, adviseFlooded, adviseFromBalance, balanceStep, calibrateEfficiency, effectiveRain, etc, flowM3sFromPower,
  flowRangeM3h, ftToM, grossNeedM3, hourlyGhiFromDaily, kcForDay, kwhPerM3, leachedNKg, modeAIntegrate, modeBDay,
  netNeedMm, pumpInputKw, pvPowerKw, rawMm, recommendedHours, rootDepthM, simulateFarm, summarise, tawMm, totalHeadM,
  ureaEquivalent, wastedKwh, type WeatherDay,
} from "@/lib/engine";

describe("units", () => {
  it("converts acres and feet", () => {
    expect(acresToM2(1)).toBeCloseTo(4046.86, 2);
    expect(ftToM(100)).toBeCloseTo(30.48, 2);
  });
});

describe("FAO-56 crop coefficient", () => {
  it("is flat in the initial stage", () => {
    expect(kcForDay("wheat", 0)).toBe(0.4);
    expect(kcForDay("wheat", 30)).toBe(0.4);
  });
  it("interpolates linearly in development", () => {
    // wheat: ini 30, dev 140 → halfway at day 100
    expect(kcForDay("wheat", 100)).toBeCloseTo((0.4 + 1.15) / 2, 6);
  });
  it("is Kc_mid in mid-season and interpolates to Kc_end in late season", () => {
    expect(kcForDay("maize", 25 + 40 + 10)).toBe(1.2);
    expect(kcForDay("maize", 25 + 40 + 45 + 15)).toBeCloseTo((1.2 + 0.35) / 2, 6);
    expect(kcForDay("maize", 500)).toBe(0.35);
  });
  it("uses a fallow coefficient before sowing", () => {
    expect(kcForDay("wheat", -5)).toBe(0.25);
  });
});

describe("crop water need", () => {
  it("computes ETc = Kc × ET0", () => expect(etc(1.15, 5)).toBeCloseTo(5.75, 6));
  it("takes 80% of rain as effective by default", () => {
    expect(effectiveRain(10)).toBeCloseTo(8, 6);
    expect(effectiveRain(-1)).toBe(0);
  });
  it("net need never goes negative and includes rice percolation", () => {
    expect(netNeedMm(3, 10)).toBe(0);
    expect(netNeedMm(6, 2, 4)).toBe(8);
  });
  it("gross need divides by application efficiency", () => {
    // 10 mm over 1 acre = 40.4686 m³ net; flood 0.55
    expect(grossNeedM3(10, acresToM2(1), 0.55)).toBeCloseTo(40.4686 / 0.55, 3);
    expect(() => grossNeedM3(10, 100, 0)).toThrow();
  });
});

describe("pump physics", () => {
  it("total head = (static + drawdown) × 1.1", () => {
    expect(totalHeadM(90, 3)).toBeCloseTo((27.432 + 3) * 1.1, 6);
  });
  it("matches the reference case: 5 kW, η 0.4, H 30 m → ≈0.0068 m³/s ≈ 24.5 m³/h", () => {
    const q = flowM3sFromPower(5000, 0.4, 30);
    expect(q).toBeCloseTo(0.0068, 4);
    expect(q * 3600).toBeCloseTo(24.5, 1);
  });
  it("energy per m³ is consistent with the flow formula", () => {
    const H = 33.5, eta = 0.4;
    const q = flowM3sFromPower(10_000, eta, H) * 3600; // m³/h at 10 kW
    expect(kwhPerM3(H, eta) * q).toBeCloseTo(10, 6);
  });
  it("PV power and start threshold / rated cap", () => {
    expect(pvPowerKw(20, 1000)).toBeCloseTo(15, 6);
    expect(pumpInputKw(2.9, 15)).toBe(0); // below 20% of 15 kW
    expect(pumpInputKw(8, 15)).toBe(8);
    expect(pumpInputKw(18, 15)).toBe(15);
  });
});

describe("solar distribution", () => {
  it("hourly GHI sums back to the daily total and is zero at night", () => {
    const h = hourlyGhiFromDaily(3.5, 31.8, 322);
    expect(h.reduce((s, x) => s + x, 0)).toBeCloseTo(3500, 0);
    expect(h[2]).toBe(0);
    expect(h[22]).toBe(0);
    expect(h[12]).toBeGreaterThan(h[8]);
  });
});

describe("Mode B daily integration", () => {
  const pump = { ratedKw: 15, pvKwp: 20, staticDepthFt: 90, drawdownM: 3, efficiency: 0.4 };
  const day = modeBDay(pump, hourlyGhiFromDaily(3.3, 31.8, 322));
  it("integrates PV energy ≈ kWp × daily kWh/m² × PR", () => {
    expect(day.pvKwh).toBeCloseTo(20 * 3.3 * 0.75, 0);
  });
  it("volume for all pumpable hours equals energy-based volume", () => {
    const all = day.runHours(24);
    expect(day.maxM3).toBeCloseTo(all.m3, 6);
    expect(all.m3).toBeCloseTo(all.kwh / kwhPerM3(totalHeadM(90, 3), 0.4), 6);
  });
  it("fractional hours scale volume and best hours come first", () => {
    const one = day.runHours(1).m3;
    expect(day.runHours(0.5).m3).toBeCloseTo(one / 2, 6);
    expect(day.flowForHours(1)).toBeGreaterThanOrEqual(day.flowForHours(6));
  });
});

describe("Mode A telemetry integration", () => {
  const pump = { ratedKw: 5, pvKwp: 7, staticDepthFt: (30 / 1.1 - 3) / 0.3048, drawdownM: 3, efficiency: 0.4 };
  it("constant 5 kW for 1 hour at H=30 m gives ≈24.5 m³ and 5 kWh", () => {
    const t0 = new Date("2026-11-18T05:00:00Z");
    const pts = Array.from({ length: 13 }, (_, i) => ({ timestamp: new Date(t0.getTime() + i * 5 * 60_000), powerKw: 5 }));
    const r = modeAIntegrate(pump, pts);
    expect(r.m3).toBeCloseTo(24.5, 1);
    expect(r.kwh).toBeCloseTo(5, 6);
    expect(r.hours).toBeCloseTo(1, 6);
  });
  it("ignores gaps longer than 15 minutes", () => {
    const pts = [
      { timestamp: new Date("2026-11-18T05:00:00Z"), powerKw: 5 },
      { timestamp: new Date("2026-11-18T06:00:00Z"), powerKw: 5 },
    ];
    expect(modeAIntegrate(pump, pts).m3).toBe(0);
  });
});

describe("bucket-test calibration", () => {
  it("recovers the efficiency used to generate the observation", () => {
    const H = totalHeadM(90, 3);
    const powerKw = 10;
    const q = flowM3sFromPower(powerKw * 1000, 0.33, H); // true η = 0.33
    const seconds = 0.2 / q; // time to fill a 200 L drum
    expect(calibrateEfficiency({ volumeL: 200, seconds, powerKw, staticDepthFt: 90, drawdownM: 3 })).toBeCloseTo(0.33, 6);
  });
  it("clamps implausible results and rejects bad input", () => {
    expect(calibrateEfficiency({ volumeL: 200, seconds: 1, powerKw: 10, staticDepthFt: 90 })).toBe(0.75);
    expect(() => calibrateEfficiency({ volumeL: 200, seconds: 0, powerKw: 10, staticDepthFt: 90 })).toThrow();
  });
  it("calibration narrows the flow range", () => {
    const base = { ratedKw: 15, pvKwp: 20, staticDepthFt: 90, efficiency: 0.4 };
    const u = flowRangeM3h({ ...base, calibrated: false }, 10);
    const c = flowRangeM3h({ ...base, calibrated: true }, 10);
    expect(u.high - u.low).toBeGreaterThan(c.high - c.low);
    expect(u.low).toBeLessThan(u.mid);
  });
});

describe("advice", () => {
  it("rounds to 0.5 h and clamps to 0–12", () => {
    expect(recommendedHours(100, 40)).toBe(2.5);
    expect(recommendedHours(1000, 40)).toBe(12);
    expect(recommendedHours(0, 40)).toBe(0);
    expect(recommendedHours(50, 0)).toBe(0);
  });
  const common = { areaM2: acresToM2(10), irrigationEfficiency: 0.55, flowM3PerHour: 30, hoursAvailableToday: 8 };
  it("keeps the pump off and counts days until RAW is reached", () => {
    const a = adviseFromBalance({ ...common, depletionStartMm: 0, rawMm: 10, forecastNetUseMm: [2, 2, 2, 2, 2, 2, 2], effRainTomorrowMm: 0 });
    expect(a.kind).toBe("keep-off");
    expect(a.hoursToday).toBe(0);
    expect(a.daysUntilNext).toBe(4); // 2,4,6,8,10 → reaches 10 on day index 4
  });
  it("irrigates when depletion reaches RAW, capped by available sun hours", () => {
    const a = adviseFromBalance({ ...common, depletionStartMm: 30, rawMm: 25, forecastNetUseMm: [2, 2, 2], effRainTomorrowMm: 0 });
    expect(a.kind).toBe("irrigate");
    expect(a.hoursToday).toBe(8);
    expect(a.totalHours).toBeGreaterThan(8);
  });
  // Rain is a bet: skipping needs the forecast to beat the need by 1.5×, a safe buffer if it misses, a reliable forecast,
  // and no critical growth stage. Need here = 24 + 2 = 26 mm.
  const rainy = { ...common, depletionStartMm: 24, rawMm: 25, tawMm: 60, forecastNetUseMm: [2, -50], fallbackNetUseMm: 4, effRainTomorrowMm: 50 };
  it("skips irrigation only when forecast rain clearly exceeds the need", () => {
    const a = adviseFromBalance(rainy);
    expect(a.kind).toBe("skip-rain");
    expect(a.rainDeclined).toBeUndefined();
  });
  it("does NOT skip when the forecast only just covers the need (margin)", () => {
    const a = adviseFromBalance({ ...rainy, effRainTomorrowMm: 30 });
    expect(a.kind).toBe("irrigate");
    expect(a.rainDeclined).toBe("margin");
  });
  it("does NOT skip on offline sample weather", () => {
    const a = adviseFromBalance({ ...rainy, weatherReliable: false });
    expect(a.kind).toBe("irrigate");
    expect(a.rainDeclined).toBe("weather");
  });
  it("never skips for rain at a critical growth stage", () => {
    const a = adviseFromBalance({ ...rainy, depletionStartMm: 10, rawMm: 25, critical: { id: "cri", startInDays: 0, endInDays: 3, minDepletionMm: 8 }, forecastNetUseMm: [2, -50] });
    expect(a.kind).toBe("irrigate");
    expect(a.rainDeclined).toBe("critical");
  });
  it("does NOT skip when waiting one more day without rain would leave the safe buffer", () => {
    // end of today 26 mm + a dry day of 20 mm = 46 > RAW 25 + half of (TAW 60 − RAW 25) = 42.5
    const a = adviseFromBalance({ ...rainy, fallbackNetUseMm: 20 });
    expect(a.kind).toBe("irrigate");
    expect(a.rainDeclined).toBe("buffer");
  });
  it("states the water to give: net depth, and gross depth at the field after losses", () => {
    const a = adviseFromBalance({ ...common, depletionStartMm: 30, rawMm: 25, forecastNetUseMm: [2, 2, 2], effRainTomorrowMm: 0 });
    expect(a.netMm).toBeCloseTo(32, 6);
    expect(a.grossMm).toBeCloseTo(32 / 0.55, 6);
    expect(adviseFromBalance({ ...common, depletionStartMm: 0, rawMm: 10, forecastNetUseMm: [2, 2], effRainTomorrowMm: 0 }).grossMm).toBe(0);
  });
  it("flooded rice uses the daily-need model", () => {
    const a = adviseFlooded({ ...common, netNeedTodayMm: 8, effRainTomorrowMm: 0 });
    expect(a.kind).toBe("irrigate");
    expect(a.hoursToday).toBe(8); // needs ≈19.6 h, capped by sun hours
    expect(adviseFlooded({ ...common, netNeedTodayMm: 8, effRainTomorrowMm: 14 }).kind).toBe("skip-rain");
  });
  it("flooded rice does not skip for a forecast that only just covers the need, or on sample weather", () => {
    const close = adviseFlooded({ ...common, netNeedTodayMm: 8, effRainTomorrowMm: 9 });
    expect(close.kind).toBe("irrigate");
    expect(close.rainDeclined).toBe("margin");
    expect(adviseFlooded({ ...common, netNeedTodayMm: 8, effRainTomorrowMm: 20, weatherReliable: false }).rainDeclined).toBe("weather");
  });
});

describe("water balance", () => {
  it("root depth grows to max by end of development", () => {
    expect(rootDepthM("wheat", 0)).toBeCloseTo(0.3, 6);
    expect(rootDepthM("wheat", 170)).toBeCloseTo(1.2, 6);
    expect(rootDepthM("wheat", 400)).toBeCloseTo(1.2, 6);
  });
  it("TAW and RAW", () => {
    expect(tawMm(0.5)).toBe(70);
    expect(rawMm(70, 0.55)).toBeCloseTo(38.5, 6);
  });
  it("over-irrigation becomes deep percolation; depletion is capped at TAW", () => {
    expect(balanceStep(5, 1, 0, 10, 50)).toEqual({ depletionMm: 0, deepPercolationMm: 4 });
    expect(balanceStep(49, 5, 0, 0, 50).depletionMm).toBe(50);
  });
});

describe("savings", () => {
  it("wasted energy and leached nitrogen", () => {
    expect(wastedKwh(100, 0.228)).toBeCloseTo(22.8, 6);
    expect(wastedKwh(-5, 0.228)).toBe(0);
    // 10 mm over 1 ha at 10 mg/L → 1 kg N
    expect(leachedNKg(10, 10_000)).toBeCloseTo(1, 6);
    expect(ureaEquivalent(4.6).kg).toBeCloseTo(10, 6);
  });
});

describe("simulateFarm (integration)", () => {
  const weather: WeatherDay[] = Array.from({ length: 14 }, (_, i) => ({
    date: `2026-11-${String(5 + i).padStart(2, "0")}`,
    et0Mm: 2,
    precipMm: 0,
    radiationMj: 12,
  }));
  const farm = {
    crop: "wheat" as const,
    sowingDate: "2026-11-05",
    areaAcres: 12.5,
    irrigationMethod: "flood" as const,
    lat: 31.8,
    pump: { ratedKw: 15, pvKwp: 20, staticDepthFt: 90, drawdownM: 3, efficiency: 0.4 },
  };
  it("pumping a wet profile is counted as excess; advice is keep-off", () => {
    const hours = Object.fromEntries(weather.slice(0, 10).map((w) => [w.date, 5]));
    const res = simulateFarm(farm, weather, hours, "2026-11-15");
    const wk = summarise(res.days);
    expect(res.days).toHaveLength(10);
    expect(wk.pumpedM3).toBeGreaterThan(wk.needM3);
    expect(wk.excessM3).toBeGreaterThan(0);
    expect(wk.excessM3).toBeLessThanOrEqual(wk.pumpedM3);
    expect(res.today.advice.kind).toBe("keep-off");
    expect(res.today.advice.daysUntilNext).toBeGreaterThan(7);
  });
  it("no pumping → no excess, and the profile dries", () => {
    const res = simulateFarm(farm, weather, {}, "2026-11-15");
    expect(summarise(res.days).excessM3).toBe(0);
    expect(res.today.depletionStartMm).toBeGreaterThan(0);
  });
});

describe("critical growth stage (wheat CRI)", () => {
  const common = { areaM2: acresToM2(10), irrigationEfficiency: 0.55, flowM3PerHour: 30, hoursAvailableToday: 8, rawMm: 28, effRainTomorrowMm: 0 };
  const crit = { id: "cri", startInDays: 0, endInDays: 5, minDepletionMm: 10 };
  it("irrigates inside the window once the soil has started drying, even below RAW", () => {
    const a = adviseFromBalance({ ...common, depletionStartMm: 12, forecastNetUseMm: [1, 1, 1], critical: crit });
    expect(a.kind).toBe("irrigate");
    expect(a.reason).toBe("critical-stage");
    expect(a.stageId).toBe("cri");
  });
  it("does not irrigate a field that is still wet", () => {
    const a = adviseFromBalance({ ...common, depletionStartMm: 0, forecastNetUseMm: [1, 1, 1, 1, 1, 1, 1], critical: crit });
    expect(a.kind).toBe("keep-off");
  });
  it("schedules the next watering at the window when the soil will be dry enough then", () => {
    const a = adviseFromBalance({ ...common, depletionStartMm: 5, forecastNetUseMm: [1, 1, 1, 1, 1, 1, 1], critical: { ...crit, startInDays: 4, endInDays: 9 } });
    expect(a.kind).toBe("keep-off");
    expect(a.daysUntilNext).toBe(4);
    expect(a.reason).toBe("critical-stage");
  });
  it("simulateFarm: unirrigated wheat at day 22 gets its first watering", () => {
    const weather = Array.from({ length: 25 }, (_, i) => ({ date: new Date(Date.UTC(2026, 9, 26 + i)).toISOString().slice(0, 10), et0Mm: 2.5, precipMm: 0, radiationMj: 13 }));
    const res = simulateFarm(
      { crop: "wheat", sowingDate: weather[0].date, areaAcres: 8, irrigationMethod: "flood", lat: 31.8, pump: { ratedKw: 15, pvKwp: 20, staticDepthFt: 90 } },
      weather, {}, weather[22].date,
    );
    expect(res.today.depletionStartMm).toBeLessThan(res.today.rawMm);
    expect(res.today.advice.kind).toBe("irrigate");
    expect(res.today.advice.reason).toBe("critical-stage");
  });
});

import { pumpOutput } from "@/lib/engine";
describe("pump output in farmer units", () => {
  it("1 cusec (101.94 m³/h) = 1,699 L/min and waters about 0.34 acre per hour (3-inch irrigation)", () => {
    const o = pumpOutput(101.94, 75);
    expect(o.cusec).toBeCloseTo(1, 6);
    expect(o.litresPerMin).toBeCloseTo(1699, 0);
    expect(o.acresPerHour).toBeCloseTo(0.336, 2); // classic rule: 1 cusec ≈ 3 hours per acre for a 3-inch watering
    expect(o.hoursPerAcre).toBeCloseTo(2.98, 1);
  });
  it("kanal and acre agree (1 acre = 8 kanal) and zero flow is safe", () => {
    const o = pumpOutput(34, 75);
    expect(o.kanalPerHour).toBeCloseTo(o.acresPerHour * 8, 3);
    expect(o.litresPerMin).toBeCloseTo(566.7, 1);
    expect(pumpOutput(0).hoursPerAcre).toBeNull();
  });
});

import { extraterrestrialRadiationMj, hargreavesEt0, radiationFromCloudCover } from "@/lib/engine";
describe("weather estimates (backup provider)", () => {
  it("extraterrestrial radiation matches FAO-56 (Example 8: 20°S on 3 Sept ≈ 32.2 MJ)", () => {
    expect(extraterrestrialRadiationMj(-20, 246)).toBeCloseTo(32.2, 0);
  });
  it("Lahore in mid-November has a plausible Ra, lower than in June", () => {
    const nov = extraterrestrialRadiationMj(31.8, 323);
    expect(nov).toBeGreaterThan(18);
    expect(nov).toBeLessThan(23);
    expect(extraterrestrialRadiationMj(31.8, 172)).toBeGreaterThan(nov + 8);
  });
  it("Hargreaves ET0 for a cool dry November day is ~2–3 mm and grows with the temperature range", () => {
    const et = hargreavesEt0(11, 24, 31.8, 323);
    expect(et).toBeGreaterThan(1.8);
    expect(et).toBeLessThan(3.2);
    expect(hargreavesEt0(8, 28, 31.8, 323)).toBeGreaterThan(et);
    expect(hargreavesEt0(20, 20, 31.8, 323)).toBe(0);
  });
  it("cloud cover reduces radiation: clear ≈ 75% of Ra, overcast ≈ 25%", () => {
    expect(radiationFromCloudCover(20, 0)).toBeCloseTo(15, 6);
    expect(radiationFromCloudCover(20, 1)).toBeCloseTo(5, 6);
    expect(radiationFromCloudCover(20, 0.5)).toBeCloseTo(10, 6);
  });
});

describe("advice confidence", () => {
  const good = { weatherSource: "live" as const, pumpCalibrated: true, hasTelemetry: false, hoursReported: true, rainForecastInvolved: false };
  it("is high only when every input is strong", () => {
    expect(adviceConfidence(good)).toEqual({ level: "high", reasons: [] });
  });
  it("is low on offline sample weather", () => {
    const c = adviceConfidence({ ...good, weatherSource: "sample" });
    expect(c.level).toBe("low");
    expect(c.reasons).toContain("weather-sample");
  });
  it("is medium for a saved or estimated forecast, an uncalibrated pump, missing hours, or a rain-dependent day", () => {
    expect(adviceConfidence({ ...good, weatherSource: "cached-live" }).level).toBe("medium");
    expect(adviceConfidence({ ...good, weatherSource: "openweather" }).level).toBe("medium");
    expect(adviceConfidence({ ...good, pumpCalibrated: false }).reasons).toEqual(["pump-uncalibrated"]);
    expect(adviceConfidence({ ...good, hoursReported: false }).reasons).toEqual(["hours-missing"]);
    expect(adviceConfidence({ ...good, rainForecastInvolved: true }).level).toBe("medium");
  });
  it("does not penalise calibration or missing hours when pump-drive telemetry is connected", () => {
    expect(adviceConfidence({ ...good, pumpCalibrated: false, hoursReported: false, hasTelemetry: true }).level).toBe("high");
  });
});

describe("soil type in the farm simulation", () => {
  const weather = Array.from({ length: 12 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, et0Mm: 3, precipMm: 0, radiationMj: 14 }));
  const farm = { crop: "wheat" as const, sowingDate: "2026-10-25", areaAcres: 5, irrigationMethod: "flood" as const, lat: 31.7, pump: { ratedKw: 11, pvKwp: 14, staticDepthFt: 90 } };
  it("is identical to the old behaviour when the soil is loam or not given", () => {
    const a = simulateFarm(farm, weather, {}, "2026-11-12");
    const b = simulateFarm({ ...farm, soilType: "loam" }, weather, {}, "2026-11-12");
    expect(b.today.tawMm).toBe(a.today.tawMm);
  });
  it("a sandy field has a smaller root-zone store than a clay field", () => {
    const sand = simulateFarm({ ...farm, soilType: "sand" }, weather, {}, "2026-11-12");
    const clay = simulateFarm({ ...farm, soilType: "clay" }, weather, {}, "2026-11-12");
    expect(sand.today.tawMm).toBeLessThan(clay.today.tawMm);
  });
});
