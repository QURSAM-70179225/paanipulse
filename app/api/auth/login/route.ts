import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api/http";
import { loginWithEmail, loginWithPhone } from "@/lib/auth/login";
import { homeFor } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

const Body = z.union([
  z.object({ kind: z.literal("phone"), phone: z.string().min(10).max(20), pin: z.string().regex(/^\d{4,6}$/) }),
  z.object({ kind: z.literal("email"), email: z.string().email().max(120), password: z.string().min(6).max(200) }),
]);

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const b = parsed.data;
  const r = b.kind === "phone" ? await loginWithPhone(b.phone, b.pin) : await loginWithEmail(b.email, b.password);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, role: r.role, home: homeFor(r.role) });
}
