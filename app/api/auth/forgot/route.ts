import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest } from "@/lib/api/http";
import { createResetToken } from "@/lib/auth/reset";
import { loginBlocked, recordFailure } from "@/lib/auth/session";
import { sendEmail } from "@/lib/services/email";
import { isDemoAccount } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

const Body = z.object({ email: z.string().email().max(120) });

/** Always answers the same way, so it can't be used to discover which emails have accounts. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const email = parsed.data.email.trim().toLowerCase();
  const generic = NextResponse.json({ ok: true });
  const key = `forgot:${email}`;
  if (loginBlocked(key)) return generic;
  recordFailure(key); // counts requests: max 8 per 15 min per email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || isDemoAccount(user)) return generic;
  const token = await createResetToken(user.id);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = process.env.APP_URL?.replace(/\/$/, "") || `${proto}://${host}`;
  await sendEmail(
    email,
    "PaaniPulse: reset your password",
    `Assalam-o-Alaikum ${user.name},\n\nUse this link within 30 minutes to set a new password:\n${base}/reset?token=${token}\n\nIf you did not ask for this, ignore this email.\n\nPaaniPulse`,
  );
  return generic;
}
