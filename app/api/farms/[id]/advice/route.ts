import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, notFound, serverError } from "@/lib/api/http";
import { getFarmState } from "@/lib/services/farmState";

export const dynamic = "force-dynamic";

const Query = z.object({
  /** Optional YYYY-MM-DD (Asia/Karachi) to compute advice "as of" that day — defaults to today. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Runs the engine for the farm, stores today's DailyRecord + Advisory, and returns the full view model. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest(parsed.error);
  const now = parsed.data.date ? new Date(`${parsed.data.date}T12:00:00+05:00`) : new Date();
  try {
    const state = await getFarmState(id, now);
    if (!state) return notFound("Farm not found");

    const date = new Date(`${state.today.date}T00:00:00+05:00`);
    await prisma.dailyRecord.upsert({
      where: { farmId_date: { farmId: id, date } },
      create: { farmId: id, date, actualHours: 0, et0: state.today.et0, etc: state.today.etc, rainMm: state.today.rainMm, needM3: state.today.needM3, recommendedHours: state.today.advice.hoursToday, pvKwh: state.today.pvKwh },
      update: { et0: state.today.et0, etc: state.today.etc, rainMm: state.today.rainMm, needM3: state.today.needM3, recommendedHours: state.today.advice.hoursToday, pvKwh: state.today.pvKwh },
    });
    const existing = await prisma.advisory.findFirst({ where: { farmId: id, date } });
    if (existing) {
      await prisma.advisory.update({ where: { id: existing.id }, data: state.advisory });
    } else {
      await prisma.advisory.create({ data: { farmId: id, date, ...state.advisory, sentVia: "app" } });
    }
    return NextResponse.json(state);
  } catch (err) {
    return serverError(err);
  }
}
