import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, unauthorized } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

const Body = z.object({ enabled: z.boolean() });

/** A farmer turns the daily advice / over-run alert text messages on or off for their own phone. */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return unauthorized();
  if (user.role !== "FARMER") return forbidden();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row || isDemoAccount(row)) return NextResponse.json({ error: "demo-account" }, { status: 403 }); // the demo phone number is fake
  await prisma.user.update({ where: { id: user.id }, data: { smsAdvice: parsed.data.enabled } });
  return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
}
