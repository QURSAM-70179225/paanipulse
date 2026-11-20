import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, guardFarm, guardRole, notFound, serverError } from "@/lib/api/http";
import { loadPump, pumpControlAvailable, setControlEnabled } from "@/lib/services/pumpControl";

export const dynamic = "force-dynamic";

/** Installer only: switch remote pump control on or off for a farm's pump (after the control box is fitted and tested). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = (await guardRole("INSTALLER")) ?? (await guardFarm(id));
  if (denied) return denied;
  if (!pumpControlAvailable()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const parsed = z.object({ enabled: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const pump = await loadPump(id);
    if (!pump) return notFound("Farm not found");
    await setControlEnabled(pump, parsed.data.enabled, "installer");
    return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
  } catch (err) {
    return serverError(err);
  }
}
