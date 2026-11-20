import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, serverError } from "@/lib/api/http";
import { deviceSync, loadPump, pumpControlAvailable } from "@/lib/services/pumpControl";

export const dynamic = "force-dynamic";

const Body = z.object({ farmId: z.string().min(1).max(64), on: z.boolean() });

/**
 * The pump control box checks in: { farmId, on } (what the relay is doing now). The answer is { command, runForSeconds, serverTime }.
 * The box must switch off by itself when runForSeconds has passed, even if it cannot reach the server again.
 * Always needs the device key: unlike soil readings, this endpoint is never open, even in a demo.
 */
export async function POST(req: Request) {
  if (!pumpControlAvailable()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const key = process.env.TELEMETRY_INGEST_KEY;
  if (!key) return NextResponse.json({ error: "device key not configured" }, { status: 503 });
  if (req.headers.get("x-ingest-key") !== key) return NextResponse.json({ error: "invalid ingest key" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  try {
    const pump = await loadPump(parsed.data.farmId);
    if (!pump) return notFound("Farm not found");
    return NextResponse.json(await deviceSync(pump, parsed.data.on));
  } catch (err) {
    return serverError(err);
  }
}
