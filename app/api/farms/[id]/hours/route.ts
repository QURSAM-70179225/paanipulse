import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, guardFarm, serverError } from "@/lib/api/http";
import { pktDateKey, pktDayStart } from "@/lib/dates";

export const dynamic = "force-dynamic";

const Body = z.object({
  /** Pump hours run on that day (farmer-reported). */
  hours: z.number().min(0).max(14),
  /** Days ago (0 = today, 1 = yesterday). Only the last 7 days can be reported. */
  daysAgo: z.number().int().min(0).max(7).default(1),
  /** Add to the hours already stored for that day (used by the pump timer) instead of replacing them. */
  add: z.boolean().default(false),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const key = pktDateKey(pktDayStart(-parsed.data.daysAgo));
    const date = new Date(`${key}T00:00:00+05:00`);
    let hours = parsed.data.hours;
    if (parsed.data.add) {
      const existing = await prisma.dailyRecord.findUnique({ where: { farmId_date: { farmId: id, date } }, select: { actualHours: true } });
      hours = Math.min(14, (existing?.actualHours ?? 0) + hours);
    }
    await prisma.dailyRecord.upsert({
      where: { farmId_date: { farmId: id, date } },
      create: { farmId: id, date, actualHours: hours },
      update: { actualHours: hours },
    });
    return NextResponse.json({ ok: true, date: key, hours });
  } catch (err) {
    return serverError(err);
  }
}
