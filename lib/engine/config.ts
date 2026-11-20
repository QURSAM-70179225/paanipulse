/**
 * Crop and engine defaults.
 * Source: FAO Irrigation & Drainage Paper 56 (Allen et al., 1998), Tables 11, 12 and 22 — adjust locally.
 * Rooting depths and depletion fractions (p) are FAO-56 Table 22 typical values.
 */
export type CropType = "wheat" | "rice" | "maize" | "cotton" | "sugarcane";
export type IrrigationMethod = "flood" | "furrow" | "sprinkler" | "drip";

export interface CropParams {
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  /** Stage lengths in days: initial, development, mid-season, late-season. */
  stages: [number, number, number, number];
  /** Maximum effective rooting depth (m). */
  rootMaxM: number;
  /** Soil-water depletion fraction before stress (FAO-56 p). */
  p: number;
  /** Flooded paddy: use daily-need model with percolation instead of the soil-water balance. */
  flooded?: boolean;
}

export const CROPS: Record<CropType, CropParams> = {
  wheat: { kcIni: 0.4, kcMid: 1.15, kcEnd: 0.3, stages: [30, 140, 40, 30], rootMaxM: 1.2, p: 0.55 },
  rice: { kcIni: 1.05, kcMid: 1.2, kcEnd: 0.75, stages: [30, 30, 60, 30], rootMaxM: 0.5, p: 0.2, flooded: true },
  maize: { kcIni: 0.3, kcMid: 1.2, kcEnd: 0.35, stages: [25, 40, 45, 30], rootMaxM: 1.0, p: 0.55 },
  cotton: { kcIni: 0.35, kcMid: 1.15, kcEnd: 0.6, stages: [30, 50, 55, 45], rootMaxM: 1.2, p: 0.65 },
  sugarcane: { kcIni: 0.4, kcMid: 1.25, kcEnd: 0.75, stages: [35, 60, 190, 120], rootMaxM: 1.2, p: 0.65 },
};

/** Bare/fallow soil before sowing (simplified FAO-56 evaporation). */
export const FALLOW = { kc: 0.25, rootM: 0.3 };

export const IRRIGATION_EFFICIENCY: Record<IrrigationMethod, number> = {
  flood: 0.55,
  furrow: 0.65,
  sprinkler: 0.75,
  drip: 0.9,
};

export const DEFAULTS = {
  /** Fraction of rainfall that is effective (simple method). */
  effectiveRainFraction: 0.8,
  /** Rice percolation/seepage loss while flooded (mm/day). */
  ricePercolationMm: 4,
  /** Available water capacity θFC − θWP (mm per m of soil) — loam. */
  soilAwcMmPerM: 140,
  /** Initial rooting depth at sowing (m). */
  rootMinM: 0.3,
  /** Pump: drawdown (m), friction allowance (fraction of static + drawdown), wire-to-water efficiency. */
  drawdownM: 3,
  frictionFraction: 0.1,
  efficiency: 0.4,
  efficiencyMin: 0.25,
  efficiencyMax: 0.6,
  /** η uncertainty band shown in the UI. */
  efficiencyBandUncalibrated: 0.08,
  efficiencyBandCalibrated: 0.03,
  /** PV performance ratio and pump start threshold (fraction of rated kW). */
  performanceRatio: 0.75,
  startThreshold: 0.2,
  /** Hold a urea dose if this much rain (mm, today + tomorrow) is forecast: rain can wash it off. General rule, confirm with an agronomist. */
  fertRainHoldMm: 10,
  /** Advice limits. */
  maxPumpHoursPerDay: 12,
  hoursStep: 0.5,
  /**
   * Typical depth of ONE flood irrigation of wheat/maize/cotton delivered at the field (mm).
   * 75 mm = 3 acre-inches, common Punjab practice. Used only to translate pump flow into "area watered per hour".
   */
  typicalIrrigationMm: 75,
  /** Value of surplus solar (Rs/kWh) — e-rickshaw battery charging. */
  surplusRsPerKwh: 20,
  /** Nitrate-N concentration in deep percolation (mg/L) for the leaching estimate. Conservative. */
  leachateNitrateNMgPerL: 10,
  /** Urea: 46% N; price per kg (Rs) — ~Rs 4,500 per 50 kg bag. */
  ureaNFraction: 0.46,
  ureaRsPerKg: 90,
};

export const SURPLUS_USES = [
  { id: "erickshaw", labelEn: "Charge e-rickshaw batteries", labelUr: "ای رکشہ بیٹری چارجنگ", rsPerKwh: 20 },
  { id: "grain-drying", labelEn: "Run a grain dryer / chakki", labelUr: "اناج خشک کرنا / چکی", rsPerKwh: 15 },
  { id: "cold-storage", labelEn: "Small cold room for vegetables/milk", labelUr: "سبزی / دودھ کے لیے ٹھنڈا کمرہ", rsPerKwh: 18 },
] as const;

/**
 * Critical growth stages where a missed irrigation costs yield (Punjab agronomy practice).
 * Wheat: first irrigation at crown-root initiation (CRI), ~20–25 days after sowing.
 * The rule only fires if the soil has started to dry (depletion ≥ minDepletionFraction × TAW),
 * so a field that is still wet is not irrigated. Adjust after validating with local farmers/extension staff.
 */
export interface CriticalStage {
  id: string;
  fromDay: number;
  toDay: number;
  minDepletionFraction: number;
  labelEn: string;
  labelUr: string;
  labelRoman: string;
}
export const CRITICAL_STAGES: Partial<Record<CropType, CriticalStage[]>> = {
  wheat: [
    { id: "cri", fromDay: 20, toDay: 25, minDepletionFraction: 0.2, labelEn: "crown roots are forming", labelUr: "گندم کی تاج جڑیں بن رہی ہیں", labelRoman: "gandum ki taaj jarein ban rahi hain" },
  ],
};
