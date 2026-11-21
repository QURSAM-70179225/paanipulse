import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, guardFarm, serverError } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { farmDevices, pairDevice } from "@/lib/services/devices";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  try {
    return NextResponse.json({ devices: await farmDevices(id) });
  } catch (err) {
    return serverError(err);
  }
}

const Body = z.object({ code: z.string().min(4).max(32), safetyConfirmed: z.boolean().default(false) });

/** The farmer (or his installer) links a SIM device to this farm by typing the code printed on it. Done once. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const user = (await getSession())!;
    const r = await pairDevice({ farmId: id, code: parsed.data.code, userId: user.id, actor: user.role === "INSTALLER" ? "installer" : "farmer", safetyConfirmed: parsed.data.safetyConfirmed });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "not-found" ? 404 : r.error === "bad-code" ? 400 : 409 });
    return NextResponse.json({ ok: true, kind: r.kind, code: r.code, devices: await farmDevices(id) });
  } catch (err) {
    return serverError(err);
  }
}
