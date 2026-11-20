/**
 * "Enough water has reached the probe" SMS. Called after soil-probe readings arrive. It lets a farmer who is away from the
 * field know it is time to go and switch the pump off. It never switches the pump itself.
 * Opt-in (the same SMS setting as daily advice), at most one SMS per farm every ALERT_GAP_HOURS, checked at most every 10 seconds per farm, and only when the newest reading of a batch is recent (back-filled history never checks).
 */
import "server-only";
import { prisma } from "@/lib/db";
import { FRESH_MINUTES, fieldFilled, RISE_WINDOW_HOURS, soilLimits } from "@/lib/engine";
import { fullSms } from "./smsText";
import { sendSms, smsConfigured } from "./sms";

export const ALERT_GAP_HOURS = 3;
const CHECK_EVERY_MS = 10_000;
const lastCheck = new Map<string, number>();

/** `batches`: for each farm, the timestamp of the newest reading just received. */
export async function checkFieldFull(batches: { farmId: string; latestAt: Date }[], now = new Date()) {
  if (!smsConfigured()) return;
  for (const { farmId, latestAt } of batches) {
    if (now.getTime() - latestAt.getTime() > FRESH_MINUTES * 60_000) continue; // old or back-filled data: nothing to warn about
    if (now.getTime() - (lastCheck.get(farmId) ?? 0) < CHECK_EVERY_MS) continue;
    lastCheck.set(farmId, now.getTime());
    const farm = await prisma.farm.findUnique({ where: { id: farmId }, select: { lastFullAlertAt: true, owner: { select: { phone: true, smsAdvice: true } } } });
    const owner = farm?.owner;
    if (!farm || !owner?.phone || !owner.smsAdvice) continue;
    if (farm.lastFullAlertAt && now.getTime() - farm.lastFullAlertAt.getTime() < ALERT_GAP_HOURS * 3_600_000) continue;
    const since = new Date(now.getTime() - (RISE_WINDOW_HOURS + 1) * 3_600_000);
    const readings = await prisma.soilReading.findMany({ where: { farmId, timestamp: { gte: since, lte: new Date(now.getTime() + 600_000) } }, orderBy: { timestamp: "asc" }, select: { timestamp: true, moisturePct: true } });
    const verdict = fieldFilled(readings.map((r) => ({ at: r.timestamp, pct: r.moisturePct })), now, soilLimits());
    if (!verdict.filled) continue;
    if (await sendSms(owner.phone, fullSms())) await prisma.farm.update({ where: { id: farmId }, data: { lastFullAlertAt: now } });
  }
}
