import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/http";
import { batchToReadings, ProbeBatchSchema } from "@/lib/devices/code";
import { deviceFromRequest, touchDevice } from "@/lib/services/devices";
import { saveSoilReadings } from "@/lib/services/soilStore";

export const dynamic = "force-dynamic";

/**
 * A SIM soil probe uploads its readings: header "Authorization: Bearer <device secret>", body { n, q, r: [[ageSeconds, moisture, temp?], ...] }.
 * The farm comes from the device's link, so the firmware never needs to know it. Readings stored while the probe had no network
 * arrive here later in one batch. The answer is short on purpose (slow 2G links).
 */
export async function POST(req: Request) {
  try {
    const device = await deviceFromRequest(req);
    if (!device || device.kind !== "probe") return NextResponse.json({ error: "unknown device" }, { status: 401 });
    const parsed = ProbeBatchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest(parsed.error);
    const now = new Date();
    await touchDevice(device.id, parsed.data.n, parsed.data.q, now);
    // Not linked to a farm yet: say so, and the probe keeps its readings and tries again later.
    if (!device.farmId) return NextResponse.json({ ok: false, linked: false }, { status: 409 });
    const farmId = device.farmId;
    await saveSoilReadings(batchToReadings(parsed.data, now).map((r) => ({ ...r, farmId, deviceId: device.id, source: "sensor" })));
    return NextResponse.json({ ok: true, n: parsed.data.r.length });
  } catch (err) {
    return serverError(err);
  }
}
