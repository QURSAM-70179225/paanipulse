import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError } from "@/lib/api/http";
import { PumpCheckInSchema } from "@/lib/devices/code";
import { deviceFromRequest, touchDevice } from "@/lib/services/devices";
import { deviceSync, loadPump, pumpControlAvailable } from "@/lib/services/pumpControl";

export const dynamic = "force-dynamic";

const LegacyBody = PumpCheckInSchema.extend({ farmId: z.string().min(1).max(64) });

/**
 * The pump control box checks in with what its relay is doing now. The answer is { command, runForSeconds, pollSeconds, serverTime }.
 * The box must switch off by itself when runForSeconds has passed, even if it never reaches the server again.
 *
 * A SIM box sends "Authorization: Bearer <device secret>" and { on, n, q }; its farm comes from its link.
 * The software simulator may instead send the shared x-ingest-key with { farmId, on }. This endpoint is never open.
 */
export async function POST(req: Request) {
  if (!pumpControlAvailable()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  try {
    const body = await req.json().catch(() => null);
    const device = await deviceFromRequest(req);
    if (device) {
      if (device.kind !== "pump") return NextResponse.json({ error: "unknown device" }, { status: 401 });
      const parsed = PumpCheckInSchema.safeParse(body);
      if (!parsed.success) return badRequest(parsed.error);
      await touchDevice(device.id, parsed.data.n, parsed.data.q);
      // Not linked (or unlinked): the box must keep the relay off.
      if (!device.farmId) return NextResponse.json({ error: "not linked", command: "off", runForSeconds: 0, pollSeconds: 60 }, { status: 409 });
      const pump = await loadPump(device.farmId);
      if (!pump) return notFound("Farm not found");
      return NextResponse.json(await deviceSync(pump, parsed.data.on));
    }
    const key = process.env.TELEMETRY_INGEST_KEY;
    if (!key || req.headers.get("x-ingest-key") !== key) return NextResponse.json({ error: "unknown device" }, { status: 401 });
    const parsed = LegacyBody.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);
    const pump = await loadPump(parsed.data.farmId);
    if (!pump) return notFound("Farm not found");
    return NextResponse.json(await deviceSync(pump, parsed.data.on));
  } catch (err) {
    return serverError(err);
  }
}
