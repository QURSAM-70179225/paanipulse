/**
 * Daily job (06:00 PKT via Vercel Cron): for every real farm
 *  1. turn yesterday's drive telemetry into run-hours (if the farm has a connected drive)
 *  2. recompute and store the last 14 days of DailyRecords (feeds the authority map)
 *  3. store today's Advisory and pre-generate its Urdu voice note (if Azure TTS is configured)
 */
import "server-only";
import { prisma } from "@/lib/db";
import { pktDateKey, pktDayStart } from "@/lib/dates";
import { modeAIntegrate } from "@/lib/engine";
import { getFarmState } from "./farmState";
import { synthesize, ttsConfigured } from "./tts";
import { dailySms } from "./smsText";
import { sendSms, smsConfigured } from "./sms";

const toDate = (key: string) => new Date(`${key}T00:00:00+05:00`);

export async function hoursFromTelemetry(pumpId: string, dayOffset: number, now: Date) {
  const from = pktDayStart(dayOffset, now);
  const to = pktDayStart(dayOffset + 1, now);
  const readings = await prisma.telemetryReading.findMany({ where: { pumpId, timestamp: { gte: from, lt: to } }, orderBy: { timestamp: "asc" } });
  if (readings.length < 2) return null;
  const pump = await prisma.pump.findUniqueOrThrow({ where: { id: pumpId } });
  return Math.round(modeAIntegrate(pump, readings.map((r) => ({ timestamp: r.timestamp, powerKw: r.powerKw }))).hours * 2) / 2;
}

export async function runDailyForFarm(farmId: string, now = new Date()) {
  const pump = await prisma.pump.findFirst({ where: { farmId } });
  if (!pump) return { farmId, skipped: "no pump" };

  // 1. Yesterday's hours from the drive, unless the farmer already reported them.
  const yKey = pktDateKey(pktDayStart(-1, now));
  if (pump.hasTelemetry) {
    const h = await hoursFromTelemetry(pump.id, -1, now);
    if (h !== null) {
      await prisma.dailyRecord.upsert({
        where: { farmId_date: { farmId, date: toDate(yKey) } },
        create: { farmId, date: toDate(yKey), actualHours: h },
        update: { actualHours: h },
      });
    }
  }

  // 2. Recompute recent history with today's weather and store it.
  const state = await getFarmState(farmId, now);
  if (!state) return { farmId, skipped: "not found" };
  for (const d of state.days.slice(-14)) {
    const data = {
      et0: d.et0, etc: d.etc, rainMm: d.rainMm, depletionMm: d.depletionEndMm, needM3: d.needM3, pumpedM3: d.pumpedM3,
      recommendedHours: d.recommendedHours, excessM3: d.excessM3, wastedKwh: d.wastedKwh, pvKwh: d.pvKwh, spareKwh: d.spareKwh,
    };
    await prisma.dailyRecord.upsert({
      where: { farmId_date: { farmId, date: toDate(d.date) } },
      create: { farmId, date: toDate(d.date), actualHours: d.actualHours, ...data },
      update: data,
    });
  }

  // Today's recommended hours: used by the pump over-run alert and the dashboard.
  const today = toDate(state.today.date);
  await prisma.dailyRecord.upsert({
    where: { farmId_date: { farmId, date: today } },
    create: { farmId, date: today, actualHours: 0, recommendedHours: state.today.advice.hoursToday, et0: state.today.et0, etc: state.today.etc, rainMm: state.today.rainMm, needM3: state.today.needM3, pvKwh: state.today.pvKwh },
    update: { recommendedHours: state.today.advice.hoursToday },
  });

  // 3. Today's advisory (+ voice).
  let audioUrl: string | null = null;
  if (ttsConfigured()) {
    const audio = await synthesize(state.advisory.textUrdu, "ur");
    if (audio) audioUrl = "/api/tts"; // cached by text hash; the player requests it with the same text
  }
  const existing = await prisma.advisory.findFirst({ where: { farmId, date: today } });
  if (existing) await prisma.advisory.update({ where: { id: existing.id }, data: { ...state.advisory, audioUrl, sentVia: "cron" } });
  else await prisma.advisory.create({ data: { farmId, date: today, ...state.advisory, audioUrl, sentVia: "cron" } });

  // 4. Daily advice by SMS / WhatsApp for farmers who opted in (works with no internet on the phone).
  let sms = false;
  if (smsConfigured()) {
    const owner = await prisma.farm.findUnique({ where: { id: farmId }, select: { owner: { select: { phone: true, smsAdvice: true } } } });
    if (owner?.owner?.smsAdvice && owner.owner.phone) {
      const a = state.today.advice;
      sms = await sendSms(owner.owner.phone, dailySms({ kind: a.kind, hoursToday: a.hoursToday, daysUntilNext: a.daysUntilNext, rainTomorrowMm: a.rainTomorrowMm }));
    }
  }

  return { farmId, advice: state.today.advice.kind, hours: state.today.advice.hoursToday, voice: !!audioUrl, sms };
}

export async function runDailyAdvisories(now = new Date()) {
  const farms = await prisma.farm.findMany({ where: { isSynthetic: false }, select: { id: true } });
  const results = [];
  for (const f of farms) {
    try {
      results.push(await runDailyForFarm(f.id, now));
    } catch (err) {
      results.push({ farmId: f.id, error: (err as Error).message });
    }
  }
  return { ranAt: now.toISOString(), farms: farms.length, results };
}
