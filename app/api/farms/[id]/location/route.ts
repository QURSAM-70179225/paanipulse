import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, guardFarm, notFound, serverError } from "@/lib/api/http";
import { checkFix } from "@/lib/services/farmLocation";

export const dynamic = "force-dynamic";

const Body = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracyM: z.number().min(0).max(100_000) });

/**
 * The farmer is standing in his field and taps "I am at my farm": the phone's GPS fix becomes the farm's location.
 * Refused if it is outside Pakistan, too imprecise, or far from the farm's district (probably not the field).
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const farm = await prisma.farm.findUnique({ where: { id }, select: { district: true } });
    if (!farm) return notFound("Farm not found");
    const verdict = checkFix(parsed.data, farm.district);
    if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 422 });
    const lat = Math.round(parsed.data.lat * 1e5) / 1e5;
    const lng = Math.round(parsed.data.lng * 1e5) / 1e5;
    await prisma.farm.update({ where: { id }, data: { lat, lng, locationSource: "farm-gps", locationSetAt: new Date() } });
    return NextResponse.json({ ok: true, lat, lng });
  } catch (err) {
    return serverError(err);
  }
}
