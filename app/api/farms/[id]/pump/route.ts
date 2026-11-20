import { NextResponse } from "next/server";
import { z } from "zod";
import { guardFarm, notFound, serverError, badRequest } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { getFarmState } from "@/lib/services/farmState";
import { loadPump, pumpControlAvailable, pumpView, setAutoStop, startPump, stopPump } from "@/lib/services/pumpControl";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  try {
    const pump = await loadPump(id);
    if (!pump) return notFound("Farm not found");
    return NextResponse.json(await pumpView(pump));
  } catch (err) {
    return serverError(err);
  }
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), hours: z.number().min(0.5).max(12), confirmOverride: z.boolean().default(false) }),
  z.object({ action: z.literal("stop") }),
  z.object({ action: z.literal("auto-stop"), enabled: z.boolean() }),
]);

/** The farmer (or his installer) starts the pump for a set time, stops it, or turns "stop automatically when full" on or off. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  if (!pumpControlAvailable()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const pump = await loadPump(id);
    if (!pump) return notFound("Farm not found");
    const user = await getSession();
    const actor = user?.role === "INSTALLER" ? "installer" : "farmer";
    const b = parsed.data;
    if (b.action === "stop") {
      if (!pump.controlEnabled) return NextResponse.json({ error: "disabled" }, { status: 409 });
      await stopPump(pump, actor, "stopped from the app");
    } else if (b.action === "auto-stop") {
      if (!pump.controlEnabled) return NextResponse.json({ error: "disabled" }, { status: 409 });
      await setAutoStop(pump, b.enabled, actor);
    } else {
      const state = await getFarmState(id);
      const verdict = await startPump({ pump, hours: b.hours, adviceKind: state?.today.advice.kind ?? "keep-off", confirmOverride: b.confirmOverride, actor });
      if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 409 });
    }
    return NextResponse.json(await pumpView((await loadPump(id))!));
  } catch (err) {
    return serverError(err);
  }
}
