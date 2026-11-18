import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, unauthorized } from "@/lib/api/http";
import { getSession, hashSecret } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

const Body = z.object({ farmerId: z.string().min(1).max(64), pin: z.string().regex(/^\d{4,6}$/) });

/** An installer can reset the PIN of a farmer whose farm they installed (identity checked in person). */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return unauthorized();
  if (user.role !== "INSTALLER") return forbidden();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { farmerId, pin } = parsed.data;
  const link = await prisma.farm.findFirst({ where: { ownerId: farmerId, installerId: user.id }, select: { id: true } });
  if (!link) return forbidden();
  const farmer = await prisma.user.findUnique({ where: { id: farmerId } });
  if (!farmer || isDemoAccount(farmer)) return forbidden();
  await prisma.user.update({ where: { id: farmerId, role: "FARMER" }, data: { passwordHash: await hashSecret(pin) } });
  return NextResponse.json({ ok: true });
}
