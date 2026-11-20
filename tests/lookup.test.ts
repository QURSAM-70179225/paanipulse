import { describe, expect, it } from "vitest";
import { awcForSoil, MAX_INTERVAL_DAYS, isSoilType, SOIL_AWC_MM_PER_M, stageMidDay, tawMm, waterLookup, type WaterLookupInput } from "@/lib/engine";

const base: WaterLookupInput = { crop: "wheat", stage: "mid", soil: "loam", season: "mild", irrigationMethod: "flood", areaAcres: 1 };

describe("soil types", () => {
  it("keeps loam at the value the app always used, and orders soils by water-holding", () => {
    expect(SOIL_AWC_MM_PER_M.loam).toBe(140);
    expect(SOIL_AWC_MM_PER_M.sand).toBeLessThan(SOIL_AWC_MM_PER_M["sandy-loam"]);
    expect(SOIL_AWC_MM_PER_M["sandy-loam"]).toBeLessThan(SOIL_AWC_MM_PER_M.loam);
    expect(SOIL_AWC_MM_PER_M.loam).toBeLessThan(SOIL_AWC_MM_PER_M.clay);
  });
  it("falls back to loam for an unknown or missing soil", () => {
    expect(awcForSoil(undefined)).toBe(140);
    expect(awcForSoil("rock")).toBe(140);
    expect(isSoilType("clay")).toBe(true);
    expect(isSoilType("rock")).toBe(false);
  });
  it("a sandy soil holds less water, so TAW is smaller", () => {
    expect(tawMm(1, awcForSoil("sand"))).toBeLessThan(tawMm(1, awcForSoil("clay")));
  });
});

describe("water chart (look-up)", () => {
  it("crop water use is Kc × the season's ET0", () => {
    const w = waterLookup(base);
    expect(w.kc).toBe(1.15);
    expect(w.et0MmDay).toBe(4);
    expect(w.etcMmDay).toBeCloseTo(4.6, 6);
  });
  it("sandy soil needs more frequent, smaller irrigations than clay", () => {
    const sand = waterLookup({ ...base, soil: "sand" });
    const clay = waterLookup({ ...base, soil: "clay" });
    expect(sand.intervalDays).toBeLessThan(clay.intervalDays);
    expect(sand.netMm).toBeLessThan(clay.netMm);
  });
  it("hotter seasons use more water per day and irrigate more often", () => {
    const cool = waterLookup({ ...base, season: "cool" });
    const hot = waterLookup({ ...base, season: "hot" });
    expect(hot.etcMmDay).toBeGreaterThan(cool.etcMmDay);
    expect(hot.intervalDays).toBeLessThan(cool.intervalDays);
    expect(hot.litresPerAcrePerDay).toBeGreaterThan(cool.litresPerAcrePerDay);
  });
  it("gross depth is net depth divided by the irrigation method's efficiency", () => {
    const flood = waterLookup(base);
    const drip = waterLookup({ ...base, irrigationMethod: "drip" });
    expect(flood.grossMm).toBeGreaterThan(drip.grossMm);
    expect(Math.abs(flood.grossMm - flood.netMm / 0.55)).toBeLessThan(1); // both are rounded to whole mm
  });
  it("scales with the farmer's area and converts to pump hours when a flow is given", () => {
    const one = waterLookup(base);
    const ten = waterLookup({ ...base, areaAcres: 10, pumpFlowM3h: 40 });
    expect(ten.litresPerIrrigation).toBeCloseTo(one.litresPerIrrigation * 10, -2);
    expect(ten.pumpHours).toBeCloseTo(ten.m3PerIrrigation / 40, 0);
    expect(one.pumpHours).toBeNull();
  });
  it("flooded rice is a daily top-up, and soil type does not change it", () => {
    const a = waterLookup({ ...base, crop: "rice", soil: "sand" });
    const b = waterLookup({ ...base, crop: "rice", soil: "clay" });
    expect(a.flooded).toBe(true);
    expect(a.intervalDays).toBe(1);
    expect(a.netMm).toBe(b.netMm);
  });
  it("uses a stage's mid point for Kc and root depth", () => {
    expect(stageMidDay("wheat", "initial")).toBe(15);
    expect(stageMidDay("wheat", "development")).toBe(30 + 70);
  });
  it("never suggests a gap longer than the cap, and then refills only what the crop used", () => {
    const w = waterLookup({ ...base, soil: "clay", season: "cool", stage: "late" });
    expect(w.intervalDays).toBe(MAX_INTERVAL_DAYS);
    expect(Math.abs(w.netMm - w.etcMmDay * MAX_INTERVAL_DAYS)).toBeLessThanOrEqual(2); // etcMmDay is rounded to 0.1 mm
  });
  it("gives a positive interval and volume for every crop, stage, soil and season", () => {
    for (const crop of ["wheat", "rice", "maize", "cotton", "sugarcane"] as const)
      for (const stage of ["initial", "development", "mid", "late"] as const)
        for (const soil of ["sand", "sandy-loam", "loam", "clay"] as const)
          for (const season of ["cool", "mild", "hot"] as const) {
            const w = waterLookup({ ...base, crop, stage, soil, season });
            expect(w.intervalDays).toBeGreaterThanOrEqual(1);
            expect(w.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
            expect(w.litresPerIrrigation).toBeGreaterThan(0);
          }
  });
});
