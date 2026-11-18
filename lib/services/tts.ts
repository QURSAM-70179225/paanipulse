/** Azure Speech neural TTS (ur-PK) cached in the database. Returns null when not configured or on failure. */
import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

export const VOICES = { ur: "ur-PK-UzmaNeural", en: "en-IN-NeerjaNeural" } as const;

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export const ttsConfigured = () => !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);

export async function synthesize(text: string, lang: "ur" | "en"): Promise<Buffer | null> {
  const voice = VOICES[lang];
  const key = createHash("sha1").update(`${voice}|${text}`).digest("hex");
  try {
    const hit = await prisma.audioCache.findUnique({ where: { id: key } });
    if (hit) return Buffer.from(hit.mp3);
  } catch {
    /* cache unavailable */
  }
  if (!ttsConfigured()) return null;
  const region = process.env.AZURE_SPEECH_REGION!;
  const ssml = `<speak version="1.0" xml:lang="${lang === "ur" ? "ur-PK" : "en-IN"}"><voice name="${voice}"><prosody rate="-8%">${escapeXml(text)}</prosody></voice></speak>`;
  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "paanipulse",
      },
      body: ssml,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    await prisma.audioCache.upsert({ where: { id: key }, create: { id: key, mp3: buf }, update: {} }).catch(() => {});
    return buf;
  } catch {
    return null;
  }
}
