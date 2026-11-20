/**
 * Remote pump control (PROTOTYPE, off unless PUMP_CONTROL_ENABLED=true). Server-only.
 * The control box (a relay or starter fitted by a qualified electrician) polls the server and does what it is told, but it also
 * enforces the hard stop time on its own clock. See docs/PUMP_CONTROL.md for the safety rules.
 */
import "server-only";
import { prisma } from "@/lib/db";
import {
  deviceCommand, effectiveOn, FRESH_MINUTES, fieldFilled, planStart, remainingSeconds, RISE_WINDOW_HOURS, shouldAutoStop, soilLimits, deviceOnline,
  type PumpControlState, type StartVerdict,
} from "@/lib/engine";

export const pumpControlAvailable = () => process.env.PUMP_CONTROL_ENABLED === "true";

type PumpRow = NonNullable<Awaited<ReturnType<typeof loadPump>>>;
export const loadPump = (farmId: string) => prisma.pump.findFirst({ where: { farmId } });
const toState = (p: PumpRow): PumpControlState => ({
  controlEnabled: p.controlEnabled, desiredOn: p.desiredOn, offAt: p.offAt, autoStopWhenFull: p.autoStopWhenFull, deviceOn: p.deviceOn, deviceSeenAt: p.deviceSeenAt,
});
const log = (pumpId: string, actor: string, action: string, detail?: string) => prisma.pumpControlLog.create({ data: { pumpId, actor, action, detail } });

/** What the farmer's screen shows. */
export async function pumpView(pump: PumpRow, now = new Date()) {
  const s = toState(pump);
  const entries = await prisma.pumpControlLog.findMany({ where: { pumpId: pump.id }, orderBy: { at: "desc" }, take: 8 });
  return {
    available: pumpControlAvailable(),
    enabled: pump.controlEnabled,
    on: effectiveOn(s, now),
    deviceReportsOn: pump.deviceOn,
    remainingSeconds: remainingSeconds(s, now),
    offAt: pump.offAt?.toISOString() ?? null,
    online: deviceOnline(s, now),
    deviceSeenAt: pump.deviceSeenAt?.toISOString() ?? null,
    autoStopWhenFull: pump.autoStopWhenFull,
    log: entries.map((e) => ({ at: e.at.toISOString(), actor: e.actor, action: e.action, detail: e.detail })),
  };
}

export async function startPump(i: { pump: PumpRow; hours: number; adviceKind: "irrigate" | "keep-off" | "skip-rain"; confirmOverride: boolean; actor: string; now?: Date }): Promise<StartVerdict> {
  const now = i.now ?? new Date();
  const verdict = planStart({ state: toState(i.pump), now, hours: i.hours, adviceKind: i.adviceKind, confirmOverride: i.confirmOverride });
  if (!verdict.ok) return verdict;
  await prisma.pump.update({ where: { id: i.pump.id }, data: { desiredOn: true, offAt: verdict.offAt } });
  await log(i.pump.id, i.actor, "start", `${verdict.hours} h${verdict.overridden ? " (advice was keep-off, farmer confirmed)" : ""}`);
  return verdict;
}

/** A stop is always accepted. */
export async function stopPump(pump: PumpRow, actor: string, detail?: string) {
  await prisma.pump.update({ where: { id: pump.id }, data: { desiredOn: false, offAt: null } });
  await log(pump.id, actor, "stop", detail);
}

export async function setAutoStop(pump: PumpRow, enabled: boolean, actor: string) {
  await prisma.pump.update({ where: { id: pump.id }, data: { autoStopWhenFull: enabled } });
  await log(pump.id, actor, enabled ? "auto-stop-on" : "auto-stop-off");
}

/** Installer only: switch remote control on or off for a pump. Switching it off also stops any run. */
export async function setControlEnabled(pump: PumpRow, enabled: boolean, actor: string) {
  await prisma.pump.update({ where: { id: pump.id }, data: enabled ? { controlEnabled: true } : { controlEnabled: false, desiredOn: false, offAt: null, autoStopWhenFull: false } });
  await log(pump.id, actor, enabled ? "enable" : "disable");
}

/** The control box checks in: record what it reports, close a run whose time is up, and answer with its order. */
export async function deviceSync(pump: PumpRow, reportedOn: boolean, now = new Date()) {
  const timeUp = pump.desiredOn && pump.offAt && now.getTime() >= pump.offAt.getTime();
  await prisma.pump.update({ where: { id: pump.id }, data: { deviceOn: reportedOn, deviceSeenAt: now, ...(timeUp ? { desiredOn: false, offAt: null } : {}) } });
  if (timeUp) await log(pump.id, "timer", "stop", "run time ended");
  const s = toState(pump);
  return { ...deviceCommand(timeUp ? { ...s, desiredOn: false, offAt: null } : s, now), serverTime: now.toISOString() };
}

/** After soil readings arrive: stop a running pump if the farmer asked for that and the soil is full. Stop only, never start. */
export async function autoStopIfFull(batches: { farmId: string; latestAt: Date }[], now = new Date()) {
  if (!pumpControlAvailable()) return;
  for (const { farmId, latestAt } of batches) {
    if (now.getTime() - latestAt.getTime() > FRESH_MINUTES * 60_000) continue;
    const pump = await loadPump(farmId);
    if (!pump || !pump.controlEnabled || !pump.autoStopWhenFull || !effectiveOn(toState(pump), now)) continue;
    const since = new Date(now.getTime() - (RISE_WINDOW_HOURS + 1) * 3_600_000);
    const rows = await prisma.soilReading.findMany({ where: { farmId, timestamp: { gte: since, lte: new Date(now.getTime() + 600_000) } }, orderBy: { timestamp: "asc" }, select: { timestamp: true, moisturePct: true } });
    const filled = fieldFilled(rows.map((r) => ({ at: r.timestamp, pct: r.moisturePct })), now, soilLimits()).filled;
    if (shouldAutoStop(toState(pump), filled, now)) await stopPump(pump, "auto-full", "soil probe shows enough water");
  }
}
