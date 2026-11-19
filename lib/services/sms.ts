/**
 * SMS / WhatsApp delivery through Twilio (REST, no SDK). Server-only.
 * TWILIO_FROM is either an SMS-capable number / sender ("+1555…") or a WhatsApp sender ("whatsapp:+14155238886").
 * Without the three TWILIO_* variables nothing is sent and the app falls back to the installer reset.
 */
import "server-only";

export const smsConfigured = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

/** "03001234567" → "+923001234567" */
export const toE164 = (local03: string) => `+92${local03.replace(/^0/, "")}`;

export async function sendSms(toLocal03: string, body: string): Promise<boolean> {
  if (!smsConfigured()) {
    console.warn(`[sms not configured] To: ${toLocal03} | ${body}`);
    return false;
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const from = process.env.TWILIO_FROM!;
  const whatsapp = from.startsWith("whatsapp:");
  const to = whatsapp ? `whatsapp:${toE164(toLocal03)}` : toE164(toLocal03);
  const base = (process.env.TWILIO_API_BASE || "https://api.twilio.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("Twilio send failed", res.status, (await res.text().catch(() => "")).slice(0, 200));
    return res.ok;
  } catch (err) {
    console.error("Twilio send error", (err as Error).message);
    return false;
  }
}
