import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest } from "@/lib/api/http";
import { consumeResetToken } from "@/lib/auth/reset";
import { hashSecret } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

const Body = z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(200) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const userId = await consumeResetToken(parsed.data.token);
  if (!userId) return NextResponse.json({ error: "invalid-or-expired" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || isDemoAccount(user)) return NextResponse.json({ error: "invalid-or-expired" }, { status: 400 });
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashSecret(parsed.data.password) } });
  return NextResponse.json({ ok: true });
}
