import { describe, expect, it } from "vitest";
import { cleanVariety, kcForDay, maturityScale, MATURITY_SCALE, rootDepthM, simulateFarm, stageForDay, VARIETIES, type CropType } from "@/lib/engine";
import { FarmCreate } from "@/lib/services/farmInput";

describe("ripening time scales the growth stages", () => {
  it("normal (or unknown) leaves the crop exactly as before", () => {
    expect(maturityScale("normal")).toBe(1);
    expect(maturityScale(undefined)).toBe(1);
    expect(maturityScale("weird")).toBe(1);
    expect(kcForDay("wheat", 100, 1)).toBe(kcForDay("wheat", 100));
    expect(stageForDay("wheat", 100, 1)).toBe(stageForDay("wheat", 100));
    expect(rootDepthM("wheat", 60, undefined, 1)).toBe(rootDepthM("wheat", 60));
  });
  it("an early variety reaches each stage sooner, a late one later", () => {
    expect(MATURITY_SCALE.early).toBeLessThan(1);
    expect(MATURITY_SCALE.late).toBeGreaterThan(1);
    // wheat: initial stage is 30 days; 28 days is "initial" normally, but "development" for an early crop (27 days).
    expect(stageForDay("wheat", 28)).toBe("initial");
    expect(stageForDay("wheat", 28, MATURITY_SCALE.early)).toBe("development");
    expect(stageForDay("wheat", 32, MATURITY_SCALE.late)).toBe("initial");
    // crop coefficient rises sooner for an early crop
    expect(kcForDay("wheat", 60, MATURITY_SCALE.early)).toBeGreaterThan(kcForDay("wheat", 60));
    // roots reach full depth sooner
    expect(rootDepthM("wheat", 120, undefined, MATURITY_SCALE.early)).toBeGreaterThan(rootDepthM("wheat", 120));
  });
  it("the farm simulation changes only when a ripening time is chosen", () => {
    const weather = Array.from({ length: 12 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, et0Mm: 3, precipMm: 0, radiationMj: 14 }));
    const farm = { crop: "wheat" as const, sowingDate: "2026-10-05", areaAcres: 5, irrigationMethod: "flood" as const, lat: 31.7, pump: { ratedKw: 11, pvKwp: 14, staticDepthFt: 90 } };
    const normal = simulateFarm(farm, weather, {}, "2026-11-12");
    expect(simulateFarm({ ...farm, maturity: "normal" }, weather, {}, "2026-11-12").today.etc).toBe(normal.today.etc);
    expect(simulateFarm({ ...farm, maturity: "early" }, weather, {}, "2026-11-12").today.etc).not.toBe(normal.today.etc);
  });
});

describe("variety names", () => {
  it("accepts ordinary names and rejects unsafe or empty text", () => {
    expect(cleanVariety("  Galaxy-2013 ")).toBe("Galaxy-2013");
    expect(cleanVariety("NIAB IRRI-9")).toBe("NIAB IRRI-9");
    expect(cleanVariety("CP 77/400")).toBe("CP 77/400");
    for (const bad of ["", "   ", null, undefined, "<script>alert(1)</script>", "a".repeat(41), "-start", "name;drop"]) expect(cleanVariety(bad as string | null | undefined)).toBeNull();
  });
  it("offers a short list for every crop, and every listed name is valid", () => {
    for (const crop of ["wheat", "rice", "maize", "cotton", "sugarcane"] as CropType[]) {
      expect(VARIETIES[crop].length).toBeGreaterThan(0);
      for (const name of VARIETIES[crop]) expect(cleanVariety(name)).toBe(name);
    }
  });
});

describe("farm input", () => {
  const base = { district: "Sheikhupura", lat: 31.7, lng: 73.98, cropType: "wheat", sowingDate: new Date(Date.now() - 14 * 86_400_000).toISOString(), areaAcres: 10, irrigationMethod: "flood", ratedKw: 11, pvKwp: 14, staticDepthFt: 90 };
  it("defaults to no variety and a normal ripening time", () => {
    const r = FarmCreate.parse(base);
    expect(r.variety).toBeNull();
    expect(r.maturity).toBe("normal");
  });
  it("keeps a clean variety name and stores unusable text as none", () => {
    expect(FarmCreate.parse({ ...base, variety: "Galaxy-2013", maturity: "early" })).toMatchObject({ variety: "Galaxy-2013", maturity: "early" });
    expect(FarmCreate.parse({ ...base, variety: "<b>x</b>" }).variety).toBeNull();
  });
  it("rejects an unknown ripening time", () => {
    expect(FarmCreate.safeParse({ ...base, maturity: "very-late" }).success).toBe(false);
  });
});
