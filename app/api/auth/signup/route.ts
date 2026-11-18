import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, serverError } from "@/lib/api/http";
import { hashSecret, startSession } from "@/lib/auth/session";
import { homeFor, normalisePhone } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("role", [
  z.object({ role: z.literal("FARMER"), name: z.string().trim().min(2).max(80), phone: z.string().min(10).max(20), pin: z.string().regex(/^\d{4,6}$/) }),
  z.object({
    role: z.literal("INSTALLER"),
    name: z.string().trim().min(2).max(80),
    organisation: z.string().trim().min(2).max(120),
    email: z.string().email().max(120),
    password: z.string().min(8).max(200),
  }),
  z.object({
    role: z.literal("AUTHORITY"),
    name: z.string().trim().min(2).max(80),
    organisation: z.string().trim().min(2).max(120),
    email: z.string().email().max(120),
    password: z.string().min(8).max(200),
    inviteCode: z.string().min(1).max(100),
  }),
]);

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const b = parsed.data;
  try {
    if (b.role === "AUTHORITY") {
      const code = process.env.AUTHORITY_INVITE_CODE;
      if (!code || b.inviteCode !== code) return NextResponse.json({ error: "invalid-invite" }, { status: 403 });
    }
    let phone: string | null = null;
    let email: string | null = null;
    if (b.role === "FARMER") {
      phone = normalisePhone(b.phone);
      if (!phone) return NextResponse.json({ error: "invalid-phone" }, { status: 400 });
      if (await prisma.user.findUnique({ where: { phone } })) return NextResponse.json({ error: "phone-taken" }, { status: 409 });
    } else {
      email = b.email.trim().toLowerCase();
      if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "email-taken" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        role: b.role,
        name: b.name,
        phone,
        email,
        organisation: b.role === "FARMER" ? null : b.organisation,
        passwordHash: await hashSecret(b.role === "FARMER" ? b.pin : b.password),
      },
    });
    await startSession({ id: user.id, role: b.role, name: user.name });
    return NextResponse.json({ ok: true, role: b.role, home: b.role === "FARMER" ? "/farmer/onboard" : homeFor(b.role) });
  } catch (err) {
    return serverError(err);
  }
}
