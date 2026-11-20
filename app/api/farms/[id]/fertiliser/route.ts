import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, guardFarm, serverError } from "@/lib/api/http";
import { validateFertRates, type FertPlan } from "@/lib/engine";
import { parseFertPlan } from "@/lib/services/fertPlan";

export const dynamic = "force-dynamic";

const Put = z.object({
  urea: z.number().min(0),
  dap: z.number().min(0),
  sop: z.number().min(0),
  ureaSplits: z.number().int().min(1).max(3),
  source: z.enum(["soil-test", "officer", "other"]),
  /** The person confirms the rate comes from a soil test or an agriculture officer, not from this app. */
  confirmed: z.literal(true),
});

/**
 * Save the fertiliser rate (bags per acre) that the farmer or installer got from a soil test or an agriculture officer.
 * PaaniPulse never suggests a rate. Values above the typo guard are rejected.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  const parsed = Put.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const problem = validateFertRates(parsed.data);
  if (problem) {
    return NextResponse.json({ error: "rate", problem }, { status: 400 });
  }
  try {
    const farm = await prisma.farm.findUnique({ where: { id }, select: { fertPlan: true } });
    const previous = parseFertPlan(farm?.fertPlan);
    const splits = parsed.data.ureaSplits as 1 | 2 | 3;
    const plan: FertPlan = {
      urea: parsed.data.urea, dap: parsed.data.dap, sop: parsed.data.sop, ureaSplits: splits,
      ureaApplied: Math.min(previous?.ureaApplied ?? 0, splits), source: parsed.data.source, updatedAt: new Date().toISOString(),
    };
    await prisma.farm.update({ where: { id }, data: { fertPlan: plan as unknown as Prisma.InputJsonValue } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

const Patch = z.object({ action: z.enum(["applied", "undo"]) });

/** Mark the next urea dose as applied, or undo the last mark. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const farm = await prisma.farm.findUnique({ where: { id }, select: { fertPlan: true } });
    const plan = parseFertPlan(farm?.fertPlan);
    if (!plan) return NextResponse.json({ error: "no-plan" }, { status: 404 });
    const next = parsed.data.action === "applied" ? Math.min(plan.ureaSplits, plan.ureaApplied + 1) : Math.max(0, plan.ureaApplied - 1);
    await prisma.farm.update({ where: { id }, data: { fertPlan: { ...plan, ureaApplied: next } as unknown as Prisma.InputJsonValue } });
    return NextResponse.json({ ok: true, ureaApplied: next });
  } catch (err) {
    return serverError(err);
  }
}

/** Remove the saved plan. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  try {
    await prisma.farm.update({ where: { id }, data: { fertPlan: Prisma.DbNull } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
