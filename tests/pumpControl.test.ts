import { describe, expect, it } from "vitest";
import { deviceCommand, deviceOnline, effectiveOn, MAX_RUN_HOURS, planStart, remainingSeconds, shouldAutoStop, type PumpControlState } from "@/lib/engine";

const now = new Date("2026-11-20T12:00:00Z");
const mins = (m: number) => new Date(now.getTime() + m * 60_000);
const state = (o: Partial<PumpControlState> = {}): PumpControlState => ({ controlEnabled: true, desiredOn: false, offAt: null, autoStopWhenFull: false, deviceOn: false, deviceSeenAt: mins(-1), ...o });
const start = (o: Partial<Parameters<typeof planStart>[0]> = {}) => planStart({ state: state(), now, hours: 2, adviceKind: "irrigate", confirmOverride: false, ...o });

describe("run state", () => {
  it("is on only while a run is active and before its hard stop", () => {
    expect(effectiveOn({ desiredOn: true, offAt: mins(30) }, now)).toBe(true);
    expect(effectiveOn({ desiredOn: true, offAt: mins(-1) }, now)).toBe(false); // past the hard stop
    expect(effectiveOn({ desiredOn: false, offAt: mins(30) }, now)).toBe(false);
    expect(effectiveOn({ desiredOn: true, offAt: null }, now)).toBe(false);
  });
  it("counts the seconds left", () => {
    expect(remainingSeconds({ desiredOn: true, offAt: mins(90) }, now)).toBe(5400);
    expect(remainingSeconds({ desiredOn: true, offAt: mins(-5) }, now)).toBe(0);
  });
  it("calls the control box offline after 10 minutes of silence", () => {
    expect(deviceOnline({ deviceSeenAt: mins(-9) }, now)).toBe(true);
    expect(deviceOnline({ deviceSeenAt: mins(-11) }, now)).toBe(false);
    expect(deviceOnline({ deviceSeenAt: null }, now)).toBe(false);
  });
});

describe("starting the pump", () => {
  it("is accepted with a hard stop time", () => {
    const v = start({ hours: 2 });
    expect(v).toMatchObject({ ok: true, hours: 2, overridden: false });
    expect(v.ok && v.offAt.getTime()).toBe(now.getTime() + 2 * 3_600_000);
  });
  it("is refused when control is not enabled for this pump", () => {
    expect(start({ state: state({ controlEnabled: false }) })).toEqual({ ok: false, reason: "disabled" });
  });
  it("is refused when the control box has not been heard from recently", () => {
    expect(start({ state: state({ deviceSeenAt: mins(-30) }) })).toEqual({ ok: false, reason: "offline" });
    expect(start({ state: state({ deviceSeenAt: null }) })).toEqual({ ok: false, reason: "offline" });
  });
  it("is limited to 0.5 to 12 hours", () => {
    expect(start({ hours: 0.25 })).toEqual({ ok: false, reason: "hours" });
    expect(start({ hours: MAX_RUN_HOURS + 0.5 })).toEqual({ ok: false, reason: "hours" });
    expect(start({ hours: NaN })).toEqual({ ok: false, reason: "hours" });
    expect(start({ hours: MAX_RUN_HOURS }).ok).toBe(true);
  });
  it("is refused while a run is already active", () => {
    expect(start({ state: state({ desiredOn: true, offAt: mins(60) }) })).toEqual({ ok: false, reason: "busy" });
  });
  it("asks the farmer to confirm when the app advises keeping the pump off", () => {
    expect(start({ adviceKind: "keep-off" })).toEqual({ ok: false, reason: "advice-off" });
    expect(start({ adviceKind: "skip-rain" })).toEqual({ ok: false, reason: "advice-off" });
    expect(start({ adviceKind: "keep-off", confirmOverride: true })).toMatchObject({ ok: true, overridden: true });
  });
});

describe("automatic stop", () => {
  const running = { desiredOn: true, offAt: mins(60), autoStopWhenFull: true };
  it("stops only when enabled, running, and the soil has enough water", () => {
    expect(shouldAutoStop(running, true, now)).toBe(true);
    expect(shouldAutoStop(running, false, now)).toBe(false);
    expect(shouldAutoStop({ ...running, autoStopWhenFull: false }, true, now)).toBe(false);
    expect(shouldAutoStop({ ...running, desiredOn: false }, true, now)).toBe(false);
  });
});

describe("the order given to the control box", () => {
  it("says on with a countdown while a run is active", () => {
    expect(deviceCommand({ controlEnabled: true, desiredOn: true, offAt: mins(45) }, now)).toEqual({ command: "on", runForSeconds: 2700 });
  });
  it("says off after the hard stop, when idle, or when control is disabled", () => {
    expect(deviceCommand({ controlEnabled: true, desiredOn: true, offAt: mins(-1) }, now)).toEqual({ command: "off", runForSeconds: 0 });
    expect(deviceCommand({ controlEnabled: true, desiredOn: false, offAt: null }, now)).toEqual({ command: "off", runForSeconds: 0 });
    expect(deviceCommand({ controlEnabled: false, desiredOn: true, offAt: mins(45) }, now)).toEqual({ command: "off", runForSeconds: 0 });
  });
});
