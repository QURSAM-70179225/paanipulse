/**
 * SIM devices: making them, linking one to a farm with its claim code, and recognising a device by its secret. Server-only.
 * See docs/SIM_DEVICES.md.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { makeCode, normalizeCode, type DeviceKind } from "@/lib/devices/code";
import { loadPump, setControlEnabled } from "./pumpControl";

export const hashSecret = (secret: string) => createHash("sha256").update(secret, "utf8").digest("hex");

/** Makes a new, unlinked device. Returns the secret ONCE: it goes into the firmware and is never stored. */
export async function createDevice(kind: DeviceKind) {
  const secret = randomBytes(24).toString("base64url");
  for (let tries = 0; tries < 5; tries++) {
    const code = makeCode((n) => randomBytes(n));
    const exists = await prisma.device.findUnique({ where: { code }, select: { id: true } });
    if (exists) continue;
    const device = await prisma.device.create({ data: { kind, code, secretHash: hashSecret(secret) } });
    return { id: device.id, kind, code, secret };
  }
  throw new Error("could not make a unique device code");
}

/** The device sending this request, from "Authorization: Bearer <secret>", or null. */
export async function deviceFromRequest(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+([A-Za-z0-9_-]{16,128})$/.exec(auth.trim());
  if (!m) return null;
  return prisma.device.findUnique({ where: { secretHash: hashSecret(m[1]) } });
}

/** Records that the device is alive, and the network it used. */
export const touchDevice = (id: string, n?: string, q?: number, now = new Date()) =>
  prisma.device.update({ where: { id }, data: { lastSeenAt: now, ...(n ? { network: n } : {}), ...(q !== undefined ? { signal: q } : {}) } });

export type PairResult =
  | { ok: true; kind: DeviceKind; code: string }
  | { ok: false; error: "bad-code" | "not-found" | "linked-elsewhere" | "needs-safety" | "pump-exists" | "no-pump" | "wrong-kind" };

/**
 * Links a device to a farm with the code printed on it. A probe links at once; several probes may share a farm.
 * A pump control box also switches remote control on, but only after the person confirms the safety checklist, and a farm has
 * one box (one motor).
 */
export async function pairDevice(i: { farmId: string; code: string; userId: string; actor: "farmer" | "installer"; safetyConfirmed: boolean; expectKind?: DeviceKind }): Promise<PairResult> {
  const code = normalizeCode(i.code);
  if (!code) return { ok: false, error: "bad-code" };
  const device = await prisma.device.findUnique({ where: { code } });
  if (!device) return { ok: false, error: "not-found" };
  const kind = device.kind as DeviceKind;
  // The probe card only links probes and the pump card only links pump boxes, so a code typed in the wrong place is caught.
  if (i.expectKind && i.expectKind !== kind) return { ok: false, error: "wrong-kind" };
  if (device.farmId === i.farmId) return { ok: true, kind, code };
  if (device.farmId) return { ok: false, error: "linked-elsewhere" };
  if (kind === "pump") {
    if (!i.safetyConfirmed) return { ok: false, error: "needs-safety" };
    const other = await prisma.device.findFirst({ where: { farmId: i.farmId, kind: "pump" }, select: { id: true } });
    if (other) return { ok: false, error: "pump-exists" };
    const pump = await loadPump(i.farmId);
    if (!pump) return { ok: false, error: "no-pump" };
    await prisma.device.update({ where: { id: device.id }, data: { farmId: i.farmId, pairedAt: new Date(), pairedBy: i.userId } });
    // Forget what an earlier box reported, so the screen waits for this box's own first check-in.
    await prisma.pump.update({ where: { id: pump.id }, data: { deviceOn: null, deviceSeenAt: null } });
    await setControlEnabled(pump, true, i.actor);
    return { ok: true, kind, code };
  }
  await prisma.device.update({ where: { id: device.id }, data: { farmId: i.farmId, pairedAt: new Date(), pairedBy: i.userId } });
  return { ok: true, kind, code };
}

/** Unlinks a device. Removing the pump box also switches remote control off and stops any run. */
export async function unpairDevice(i: { farmId: string; deviceId: string; actor: "farmer" | "installer" }) {
  const device = await prisma.device.findFirst({ where: { id: i.deviceId, farmId: i.farmId } });
  if (!device) return false;
  await prisma.device.update({ where: { id: device.id }, data: { farmId: null, pairedAt: null, pairedBy: null } });
  if (device.kind === "pump") {
    const pump = await loadPump(i.farmId);
    if (pump) {
      await setControlEnabled(pump, false, i.actor);
      await prisma.pump.update({ where: { id: pump.id }, data: { deviceOn: null, deviceSeenAt: null } });
    }
  }
  return true;
}

/** What the farm page shows about its devices. */
export async function farmDevices(farmId: string) {
  const rows = await prisma.device.findMany({ where: { farmId }, orderBy: { pairedAt: "asc" } });
  return rows.map((d) => ({
    id: d.id,
    kind: d.kind as DeviceKind,
    code: d.code,
    lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    network: d.network,
    signal: d.signal,
  }));
}
export type FarmDevice = Awaited<ReturnType<typeof farmDevices>>[number];
