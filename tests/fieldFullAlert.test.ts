import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ farmFind: vi.fn(), farmUpdate: vi.fn(), readingsFind: vi.fn(), sendSms: vi.fn(), configured: { on: true } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { farm: { findUnique: m.farmFind, update: m.farmUpdate }, soilReading: { findMany: m.readingsFind } } }));
vi.mock("@/lib/services/sms", () => ({ sendSms: (...a: unknown[]) => m.sendSms(...a), smsConfigured: () => m.configured.on }));

import { ALERT_GAP_HOURS, checkFieldFull } from "@/lib/services/fieldFullAlert";
import { fullSms } from "@/lib/services/smsText";

const now = new Date("2026-11-20T12:00:00Z");
const mk = (minAgo: number, pct: number) => ({ timestamp: new Date(now.getTime() - minAgo * 60_000), moisturePct: pct });
const filledReadings = [mk(150, 19), mk(90, 22), mk(30, 28.5), mk(10, 29)];
let n = 0;
const fresh = new Date(now.getTime() - 60_000);
const nextFarm = () => `farm-${++n}`; // the service keeps a per-farm "checked recently" memory, so each test uses a new farm

beforeEach(() => {
  m.sendSms.mockReset().mockResolvedValue(true);
  m.farmFind.mockReset().mockResolvedValue({ lastFullAlertAt: null, owner: { phone: "03001234567", smsAdvice: true } });
  m.farmUpdate.mockReset();
  m.readingsFind.mockReset().mockResolvedValue(filledReadings);
  m.configured.on = true;
});

describe("field-full SMS", () => {
  it("sends one SMS when the soil got wetter and is now near field capacity, and records the time", async () => {
    const id = nextFarm();
    await checkFieldFull([{ farmId: id, latestAt: fresh }], now);
    expect(m.sendSms).toHaveBeenCalledTimes(1);
    expect(m.sendSms).toHaveBeenCalledWith("03001234567", fullSms());
    expect(m.farmUpdate).toHaveBeenCalledWith({ where: { id }, data: { lastFullAlertAt: now } });
  });
  it("does not send twice within the gap", async () => {
    m.farmFind.mockResolvedValue({ lastFullAlertAt: new Date(now.getTime() - 60 * 60_000), owner: { phone: "03001234567", smsAdvice: true } });
    await checkFieldFull([{ farmId: nextFarm(), latestAt: fresh }], now);
    expect(m.sendSms).not.toHaveBeenCalled();
  });
  it("sends again once the gap has passed", async () => {
    m.farmFind.mockResolvedValue({ lastFullAlertAt: new Date(now.getTime() - (ALERT_GAP_HOURS + 0.1) * 3_600_000), owner: { phone: "03001234567", smsAdvice: true } });
    await checkFieldFull([{ farmId: nextFarm(), latestAt: fresh }], now);
    expect(m.sendSms).toHaveBeenCalledTimes(1);
  });
  it("sends nothing if the farmer has not opted in, or has no phone", async () => {
    m.farmFind.mockResolvedValue({ lastFullAlertAt: null, owner: { phone: "03001234567", smsAdvice: false } });
    await checkFieldFull([{ farmId: nextFarm(), latestAt: fresh }], now);
    m.farmFind.mockResolvedValue({ lastFullAlertAt: null, owner: { phone: null, smsAdvice: true } });
    await checkFieldFull([{ farmId: nextFarm(), latestAt: fresh }], now);
    expect(m.sendSms).not.toHaveBeenCalled();
  });
  it("sends nothing when the field is not full, or the readings are old", async () => {
    m.readingsFind.mockResolvedValue([mk(150, 19), mk(90, 20), mk(30, 21), mk(10, 22)]);
    await checkFieldFull([{ farmId: nextFarm(), latestAt: fresh }], now);
    m.readingsFind.mockResolvedValue([mk(400, 19), mk(300, 28.5), mk(290, 29)]);
    await checkFieldFull([{ farmId: nextFarm(), latestAt: fresh }], now);
    expect(m.sendSms).not.toHaveBeenCalled();
  });
  it("does not record an alert if the SMS could not be sent", async () => {
    m.sendSms.mockResolvedValue(false);
    await checkFieldFull([{ farmId: nextFarm(), latestAt: fresh }], now);
    expect(m.farmUpdate).not.toHaveBeenCalled();
  });
  it("does nothing when SMS is not configured", async () => {
    m.configured.on = false;
    await checkFieldFull([{ farmId: nextFarm(), latestAt: fresh }], now);
    expect(m.farmFind).not.toHaveBeenCalled();
  });
  it("skips a batch of old or back-filled readings without touching the database", async () => {
    await checkFieldFull([{ farmId: nextFarm(), latestAt: new Date(now.getTime() - 3 * 3_600_000) }], now);
    expect(m.farmFind).not.toHaveBeenCalled();
  });
  it("checks each farm only every few seconds", async () => {
    const id = nextFarm();
    await checkFieldFull([{ farmId: id, latestAt: fresh }], now);
    await checkFieldFull([{ farmId: id, latestAt: fresh }], new Date(now.getTime() + 3_000));
    expect(m.farmFind).toHaveBeenCalledTimes(1);
  });
  it("the message is plain ASCII and fits one 160-character SMS", () => {
    expect(fullSms().length).toBeLessThanOrEqual(160);
    expect(/^[\x20-\x7E]+$/.test(fullSms())).toBe(true);
  });
});
