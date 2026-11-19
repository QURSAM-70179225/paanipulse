import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest } from "@/lib/api/http";
import { createPhoneCode } from "@/lib/auth/reset";
import { isDemoAccount, normalisePhone } from "@/lib/auth/token";
import { sendSms, smsConfigured } from "@/lib/services/sms";

export const dynamic = "force-dynamic";

const Body = z.object({ phone: z.string().min(10).max(20) });

/** Sends a 6-digit code to the farmer's phone. Same answer whether or not the number has an account. */
export async function POST(req: Request) {
  if (!smsConfigured()) return NextResponse.json({ error: "sms-unavailable" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const phone = normalisePhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "invalid-phone" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { phone } });
  if (user && user.role === "FARMER" && !isDemoAccount(user)) {
    const code = await createPhoneCode(user.id);
    if (code) await sendSms(phone, `PaaniPulse: aap ka code ${code} hai. 10 minute mein istemal karein. Ye code kisi ko na batayein.`);
  }
  return NextResponse.json({ ok: true });
}
