/**
 * Short plain-ASCII (Roman Urdu) messages for SMS: one 160-character segment, readable on any phone,
 * no Urdu script (which would cut the length to 70 characters per message). Numbers come from the engine.
 */
import type { AdviceKind } from "@/lib/engine";

const h = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

function whenNext(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 1) return "kal";
  if (days <= 14) return `${days} din baad`;
  return `${Math.round(days / 7)} hafte baad`;
}

export function dailySms(f: { kind: AdviceKind; hoursToday: number; daysUntilNext: number | null; rainTomorrowMm: number }): string {
  const parts: string[] = ["PaaniPulse:"];
  if (f.kind === "irrigate") parts.push(`Aaj pump ${h(f.hoursToday)} ghantay chalayen (dopahar mein).`);
  else if (f.kind === "skip-rain") parts.push("Aaj pump na chalayen, kal barish ka imkaan hai.");
  else {
    parts.push("Aaj pump band rakhein.");
    const next = whenNext(f.daysUntilNext);
    if (next) parts.push(`Agla pani ${next}.`);
    if (f.rainTomorrowMm >= 2) parts.push("Kal barish ka imkaan.");
  }
  return parts.join(" ").slice(0, 160);
}

export function overrunSms(f: { ranHours: number; recommendedHours: number }): string {
  const text =
    f.recommendedHours <= 0
      ? `PaaniPulse: Aaj pump ki zaroorat nahi thi, ${h(f.ranHours)} ghantay chal chuka. Ab pump band karein, pani zaya ho raha hai.`
      : `PaaniPulse: Pump ${h(f.ranHours)} ghantay chal chuka (zaroorat ${h(f.recommendedHours)}). Ab pump band karein, pani zaya ho raha hai.`;
  return text.slice(0, 160);
}
