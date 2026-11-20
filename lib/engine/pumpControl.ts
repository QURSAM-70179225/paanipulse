/**
 * Remote pump control rules. Pure. PROTOTYPE: needs a relay or starter fitted by a qualified electrician.
 *
 * Safety principles (see docs/PUMP_CONTROL.md):
 *  1. Automation may only STOP the pump. Starting always needs an explicit command from the farmer, with a duration.
 *  2. Every run has a HARD STOP TIME (offAt). The control box enforces it on its own clock, so a lost phone or network can
 *     never leave the pump running past it.
 *  3. A stop is always accepted, immediately.
 *  4. The pump cannot be started from the app if the control box has not been heard from recently (we would not know what it does).
 */

export const MIN_RUN_HOURS = 0.5;
export const MAX_RUN_HOURS = 12;
/** The control box is "offline" if it has not contacted the server for this long. */
export const DEVICE_STALE_MINUTES = 10;

export interface PumpControlState {
  controlEnabled: boolean;
  desiredOn: boolean;
  offAt: Date | null;
  autoStopWhenFull: boolean;
  deviceOn: boolean | null;
  deviceSeenAt: Date | null;
}

/** What the server wants right now: on only while a run is active and before its hard stop. */
export const effectiveOn = (s: Pick<PumpControlState, "desiredOn" | "offAt">, now: Date): boolean => s.desiredOn && !!s.offAt && now.getTime() < s.offAt.getTime();

/** Seconds left until the hard stop (0 when off). */
export const remainingSeconds = (s: Pick<PumpControlState, "desiredOn" | "offAt">, now: Date): number =>
  effectiveOn(s, now) ? Math.max(0, Math.floor((s.offAt!.getTime() - now.getTime()) / 1000)) : 0;

export const deviceOnline = (s: Pick<PumpControlState, "deviceSeenAt">, now: Date): boolean =>
  !!s.deviceSeenAt && now.getTime() - s.deviceSeenAt.getTime() <= DEVICE_STALE_MINUTES * 60_000;

export type StartRefusal = "disabled" | "offline" | "hours" | "busy" | "advice-off";
export type StartVerdict = { ok: true; hours: number; offAt: Date; overridden: boolean } | { ok: false; reason: StartRefusal };

/** May the farmer start the pump for `hours` now? "advice-off" means: the app advises keeping the pump off, so ask the farmer to confirm. */
export function planStart(i: { state: PumpControlState; now: Date; hours: number; adviceKind: "irrigate" | "keep-off" | "skip-rain"; confirmOverride: boolean }): StartVerdict {
  const { state, now, hours } = i;
  if (!state.controlEnabled) return { ok: false, reason: "disabled" };
  if (!deviceOnline(state, now)) return { ok: false, reason: "offline" };
  if (!(hours >= MIN_RUN_HOURS && hours <= MAX_RUN_HOURS)) return { ok: false, reason: "hours" };
  if (effectiveOn(state, now)) return { ok: false, reason: "busy" };
  const overridden = i.adviceKind !== "irrigate";
  if (overridden && !i.confirmOverride) return { ok: false, reason: "advice-off" };
  return { ok: true, hours, offAt: new Date(now.getTime() + hours * 3_600_000), overridden };
}

/** Automatic stop is allowed only when the farmer turned it on, the pump is meant to be running, and the soil probe says enough water. */
export const shouldAutoStop = (s: Pick<PumpControlState, "desiredOn" | "offAt" | "autoStopWhenFull">, filled: boolean, now: Date): boolean =>
  s.autoStopWhenFull && effectiveOn(s, now) && filled;

/** The device's order: command plus how long it may run (it must stop by then even if it loses contact). */
export function deviceCommand(s: Pick<PumpControlState, "desiredOn" | "offAt" | "controlEnabled">, now: Date): { command: "on" | "off"; runForSeconds: number } {
  if (!s.controlEnabled || !effectiveOn(s, now)) return { command: "off", runForSeconds: 0 };
  return { command: "on", runForSeconds: remainingSeconds(s, now) };
}
