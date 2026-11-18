import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, unauthorized } from "@/lib/api/http";
import { checkSecret, getSession, hashSecret } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

const Body = z.object({ current: z.string().min(4).max(200), next: z.string().min(4).max(200) });

/** Signed-in users change their own PIN (farmers: 4–6 digits) or password (others: 8+ characters). */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { current, next } = parsed.data;
  if (user.role === "FARMER" ? !/^\d{4,6}$/.test(next) : next.length < 8) return NextResponse.json({ error: "weak" }, { status: 400 });
  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (row && isDemoAccount(row)) return NextResponse.json({ error: "demo-account" }, { status: 403 });
  if (!row || !(await checkSecret(current, row.passwordHash))) return NextResponse.json({ error: "wrong-current" }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashSecret(next) } });
  return NextResponse.json({ ok: true });
}
