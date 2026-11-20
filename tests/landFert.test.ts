import { describe, expect, it } from "vitest";
import {
  areaLimits, areaNumber, BAG_KG, fertHint, fertSchedule, fertTotals, fromAcres, M2_PER_ACRE, KANAL_M2, toAcres, validateFertRates, type FertPlan,
} from "@/lib/engine";

describe("land units", () => {
  it("converts with the Punjab convention", () => {
    expect(toAcres(8, "kanal")).toBeCloseTo(1, 9);
    expect(toAcres(160, "marla")).toBeCloseTo(1, 9);
    expect(toAcres(1, "murabba")).toBe(25);
    expect(toAcres(3, "ghumaon")).toBe(3);
    expect(fromAcres(2.5, "kanal")).toBeCloseTo(20, 9);
  });
  it("agrees with the engine's kanal in square metres", () => {
    expect(toAcres(1, "kanal") * M2_PER_ACRE).toBeCloseTo(KANAL_M2, 0);
  });
  it("round-trips a typed value", () => {
    for (const u of ["acre", "kanal", "marla", "murabba", "ghumaon"] as const) expect(fromAcres(toAcres(7, u), u)).toBeCloseTo(7, 9);
  });
  it("formats the area the farmer would say", () => {
    expect(areaNumber(12.5, "acre")).toBe("12.5");
    expect(areaNumber(12.5, "kanal")).toBe("100");
    expect(areaNumber(1, "marla")).toBe("160");
    expect(areaNumber(50, "murabba")).toBe("2");
    expect(areaNumber(0.5, "kanal")).toBe("4");
  });
  it("limits follow the 0.5–500 acre range in each unit", () => {
    expect(areaLimits("acre").min).toBeCloseTo(0.5, 9);
    expect(areaLimits("kanal").max).toBeCloseTo(4000, 6);
    expect(areaLimits("murabba").max).toBeCloseTo(20, 9);
  });
});

const plan = (over: Partial<FertPlan> = {}): FertPlan => ({ urea: 2, dap: 1, sop: 0.5, ureaSplits: 2, ureaApplied: 0, source: "officer", updatedAt: "2026-11-20T00:00:00Z", ...over });

describe("fertiliser for the land", () => {
  it("multiplies the farmer's rate by his area", () => {
    const t = fertTotals(plan(), 12.5);
    expect(t.find((l) => l.product === "urea")).toEqual({ product: "urea", bags: 25, kg: 25 * BAG_KG });
    expect(t.find((l) => l.product === "dap")?.bags).toBe(12.5);
    expect(t.find((l) => l.product === "sop")?.bags).toBe(6.3); // 6.25 → 6.3
  });
  it("leaves out products with no rate", () => {
    expect(fertTotals(plan({ dap: 0, sop: 0 }), 10).map((l) => l.product)).toEqual(["urea"]);
  });
  it("puts P and K at sowing and splits urea into equal doses", () => {
    const s = fertSchedule(plan(), 10);
    expect(s[0].kind).toBe("sowing");
    expect(s[0].lines.map((l) => l.product)).toEqual(["dap", "sop"]);
    const urea = s.filter((d) => d.kind === "urea");
    expect(urea).toHaveLength(2);
    expect(urea[0].lines[0].bags).toBe(10); // 2 bags/acre × 10 acres ÷ 2 doses
    expect(urea.map((d) => d.applied)).toEqual([false, false]);
  });
  it("marks applied doses", () => {
    const urea = fertSchedule(plan({ ureaApplied: 1 }), 10).filter((d) => d.kind === "urea");
    expect(urea.map((d) => d.applied)).toEqual([true, false]);
  });
  it("rejects rates above the typo guard, empty plans and bad splits", () => {
    expect(validateFertRates({ urea: 20, dap: 0, sop: 0, ureaSplits: 2 })).toEqual({ product: "urea", max: 6 });
    expect(validateFertRates({ urea: 0, dap: 0, sop: 0, ureaSplits: 2 })).toBe("empty");
    expect(validateFertRates({ urea: 2, dap: 0, sop: 0, ureaSplits: 5 })).toBe("splits");
    expect(validateFertRates({ urea: -1, dap: 0, sop: 0, ureaSplits: 2 })).toEqual({ product: "urea", max: 6 });
    expect(validateFertRates({ urea: 2, dap: 1, sop: 0.5, ureaSplits: 3 })).toBeNull();
  });
});

describe("urea timing hint", () => {
  it("says to apply the next dose just before an irrigation", () => {
    expect(fertHint(plan(), 10, "irrigate", 0)).toEqual({ kind: "apply", dose: 1, bags: 10 });
    expect(fertHint(plan({ ureaApplied: 1 }), 10, "irrigate", 2)).toEqual({ kind: "apply", dose: 2, bags: 10 });
  });
  it("holds the dose when heavy rain is forecast", () => {
    expect(fertHint(plan(), 10, "irrigate", 12)).toEqual({ kind: "hold-rain", dose: 1, rainMm: 12 });
  });
  it("waits on days without irrigation, and reports when all doses are done", () => {
    expect(fertHint(plan(), 10, "keep-off", 0)).toEqual({ kind: "wait" });
    expect(fertHint(plan(), 10, "skip-rain", 30)).toEqual({ kind: "wait" });
    expect(fertHint(plan({ ureaApplied: 2 }), 10, "irrigate", 0)).toEqual({ kind: "done" });
  });
  it("gives no hint when no urea is planned", () => {
    expect(fertHint(plan({ urea: 0 }), 10, "irrigate", 0)).toBeNull();
  });
});
