/**
 * Fertiliser for a farmer's land. Pure.
 *
 * IMPORTANT: PaaniPulse does NOT decide how much fertiliser to use. The rate per acre comes from the farmer's soil test or an
 * agriculture officer and is typed in by the farmer or installer. This module only (1) multiplies that rate by the land area,
 * (2) splits the urea into doses and orders them with the irrigations, and (3) holds a dose if heavy rain is forecast.
 */
import { DEFAULTS } from "./config";

export const FERT_PRODUCTS = ["urea", "dap", "sop"] as const;
export type FertProduct = (typeof FERT_PRODUCTS)[number];

/** One bag in Pakistan is 50 kg. */
export const BAG_KG = 50;

/** Typo guard (bags per acre). Anything above is rejected and the farmer is told to check the number with an officer. */
export const FERT_MAX_BAGS_PER_ACRE: Record<FertProduct, number> = { urea: 6, dap: 4, sop: 3 };

export type FertSource = "soil-test" | "officer" | "other";

export interface FertPlan {
  /** Bags (50 kg) per acre, from the soil test or officer. */
  urea: number;
  dap: number;
  sop: number;
  /** Urea doses: 1–3 (nitrogen is normally split in 2–3 doses). */
  ureaSplits: 1 | 2 | 3;
  /** How many urea doses the farmer has marked as applied. */
  ureaApplied: number;
  source: FertSource;
  updatedAt: string;
}

export interface FertPlanInput {
  urea: number;
  dap: number;
  sop: number;
  ureaSplits: number;
}

/** Returns an error code for the first problem, or null if the rates are acceptable. */
export function validateFertRates(i: FertPlanInput): { product: FertProduct; max: number } | "empty" | "splits" | null {
  for (const p of FERT_PRODUCTS) {
    if (!(i[p] >= 0) || i[p] > FERT_MAX_BAGS_PER_ACRE[p]) return { product: p, max: FERT_MAX_BAGS_PER_ACRE[p] };
  }
  if (i.urea + i.dap + i.sop <= 0) return "empty";
  if (![1, 2, 3].includes(i.ureaSplits)) return "splits";
  return null;
}

export interface FertLine {
  product: FertProduct;
  bags: number;
  kg: number;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Total bags and kg of each product for the whole land. */
export function fertTotals(plan: Pick<FertPlan, FertProduct>, acres: number): FertLine[] {
  return FERT_PRODUCTS.filter((p) => plan[p] > 0).map((p) => {
    const bags = plan[p] * acres;
    return { product: p, bags: r1(bags), kg: Math.round(bags * BAG_KG) };
  });
}

export interface FertDose {
  id: string;
  /** "sowing" = DAP and potash (and urea dose 1 if the urea is a single dose); otherwise urea dose k of n. */
  kind: "sowing" | "urea";
  /** Urea dose number (1-based) for kind "urea". */
  dose?: number;
  lines: FertLine[];
  applied: boolean;
}

/**
 * The order of work. P and K go in at sowing (Punjab Agriculture Department wheat advisory); nitrogen is split into
 * equal doses (2–3), the first before the first irrigation and the rest with later irrigations.
 */
export function fertSchedule(plan: FertPlan, acres: number): FertDose[] {
  const doses: FertDose[] = [];
  const sowing: FertLine[] = (["dap", "sop"] as const).filter((p) => plan[p] > 0).map((p) => ({ product: p, bags: r1(plan[p] * acres), kg: Math.round(plan[p] * acres * BAG_KG) }));
  if (sowing.length) doses.push({ id: "sowing", kind: "sowing", lines: sowing, applied: false });
  if (plan.urea > 0) {
    const each = (plan.urea * acres) / plan.ureaSplits;
    for (let k = 1; k <= plan.ureaSplits; k++) {
      doses.push({ id: `urea-${k}`, kind: "urea", dose: k, lines: [{ product: "urea", bags: r1(each), kg: Math.round(each * BAG_KG) }], applied: k <= plan.ureaApplied });
    }
  }
  return doses;
}

export type FertHint =
  | { kind: "apply"; dose: number; bags: number }
  | { kind: "hold-rain"; dose: number; rainMm: number }
  | { kind: "wait" }
  | { kind: "done" };

/**
 * What to do with urea today. A dose goes on just before an irrigation. It is held if heavy rain is forecast
 * (rain can wash urea off or below the roots). Thresholds are a general agronomic rule: confirm with an agronomist.
 */
export function fertHint(plan: FertPlan, acres: number, adviceKind: "irrigate" | "keep-off" | "skip-rain", rainNext2DaysMm: number): FertHint | null {
  if (plan.urea <= 0) return null;
  if (plan.ureaApplied >= plan.ureaSplits) return { kind: "done" };
  const dose = plan.ureaApplied + 1;
  if (adviceKind !== "irrigate") return { kind: "wait" };
  if (rainNext2DaysMm >= DEFAULTS.fertRainHoldMm) return { kind: "hold-rain", dose, rainMm: Math.round(rainNext2DaysMm) };
  return { kind: "apply", dose, bags: r1((plan.urea * acres) / plan.ureaSplits) };
}
