/** Reading the stored fertiliser plan safely (it is JSON in the database). */
import { z } from "zod";
import type { FertPlan } from "@/lib/engine";

const StoredPlan = z.object({
  urea: z.number().min(0),
  dap: z.number().min(0),
  sop: z.number().min(0),
  ureaSplits: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ureaApplied: z.number().int().min(0).max(3).default(0),
  source: z.enum(["soil-test", "officer", "other"]),
  updatedAt: z.string(),
});

export function parseFertPlan(json: unknown): FertPlan | null {
  const r = StoredPlan.safeParse(json);
  if (!r.success) return null;
  return { ...r.data, ureaApplied: Math.min(r.data.ureaApplied, r.data.ureaSplits) };
}
