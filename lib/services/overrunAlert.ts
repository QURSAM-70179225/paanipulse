/**
 * "Pump has run longer than advised" SMS. Called after drive readings arrive; works only for farms with a connected
 * drive (the app has to know the pump is running). At most one SMS per pump per day, checked at most every 5 minutes.
 */
import "server-only";
import { prisma } from "@/lib/db";
import { pktDateKey, pktDayStart } from "@/lib/dates";
import { modeAIntegrate } from "@/lib/engine";
import { overrunSms } from "./smsText";
import { sendSms, smsConfigured } from "./sms";

const lastCheck = new Map<string, number>();
const CHECK_EVERY_MS = 5 * 60_000;
/** How much over the advised hours before warning (so a few minutes' difference doesn't ring). */
const GRACE_HOURS = 0.25;

export async function checkOverrun(pumpIds: string[], now = new Date()) {
  if (!smsConfigured()) return;
  const today = pktDateKey(pktDayStart(0, now));
  for (const pumpId of pumpIds) {
    if (now.getTime() - (lastCheck.get(pumpId) ?? 0) < CHECK_EVERY_MS) continue;
    lastCheck.set(pumpId, now.getTime());
    const pump = await prisma.pump.findUnique({ where: { id: pumpId }, include: { farm: { include: { owner: true } } } });
    const owner = pump?.farm.owner;
    if (!pump || !owner?.phone || !owner.smsAdvice || pump.lastOverrunAlert === today) continue;
    const record = await prisma.dailyRecord.findUnique({ where: { farmId_date: { farmId: pump.farmId, date: new Date(`${today}T00:00:00+05:00`) } } });
    if (record?.recommendedHours == null) continue; // no advice computed for today yet
    const readings = await prisma.telemetryReading.findMany({ where: { pumpId, timestamp: { gte: pktDayStart(0, now) } }, orderBy: { timestamp: "asc" } });
    const ran = modeAIntegrate(pump, readings.map((r) => ({ timestamp: r.timestamp, powerKw: r.powerKw }))).hours;
    if (ran < record.recommendedHours + GRACE_HOURS) continue;
    if (await sendSms(owner.phone, overrunSms({ ranHours: ran, recommendedHours: record.recommendedHours }))) {
      await prisma.pump.update({ where: { id: pumpId }, data: { lastOverrunAlert: today } });
    }
  }
}
