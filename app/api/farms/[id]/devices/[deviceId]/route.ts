import { NextResponse } from "next/server";
import { guardFarm, notFound, serverError } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { farmDevices, unpairDevice } from "@/lib/services/devices";

export const dynamic = "force-dynamic";

/** Unlinks a device from this farm (for example, to move it to another farm). Removing the pump box switches remote control off. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; deviceId: string }> }) {
  const { id, deviceId } = await params;
  const denied = await guardFarm(id);
  if (denied) return denied;
  try {
    const user = (await getSession())!;
    const ok = await unpairDevice({ farmId: id, deviceId, actor: user.role === "INSTALLER" ? "installer" : "farmer" });
    if (!ok) return notFound("Device not found");
    return NextResponse.json({ ok: true, devices: await farmDevices(id) });
  } catch (err) {
    return serverError(err);
  }
}
