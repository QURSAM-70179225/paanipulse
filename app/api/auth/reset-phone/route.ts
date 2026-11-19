import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest } from "@/lib/api/http";
import { consumePhoneCode } from "@/lib/auth/reset";
import { hashSecret } from "@/lib/auth/session";
import { isDemoAccount, normalisePhone } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

const Body = z.object({ phone: z.string().min(10).max(20), code: z.string().regex(/^\d{6}$/), pin: z.string().regex(/^\d{4,6}$/) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const phone = normalisePhone(parsed.data.phone);
  const user = phone ? await prisma.user.findUnique({ where: { phone } }) : null;
  const bad = NextResponse.json({ error: "invalid-or-expired" }, { status: 400 });
  if (!user || user.role !== "FARMER" || isDemoAccount(user)) return bad;
  if (!(await consumePhoneCode(user.id, parsed.data.code))) return bad;
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashSecret(parsed.data.pin) } });
  return NextResponse.json({ ok: true });
}
