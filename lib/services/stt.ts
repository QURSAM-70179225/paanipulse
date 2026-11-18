/** Speech-to-text via Groq Whisper. Server-only. */
import "server-only";

export const sttModel = () => process.env.GROQ_STT_MODEL || "whisper-large-v3";

/**
 * Transcribe a short voice note. Language is forced ("ur" → Urdu script) because auto-detection
 * often mistakes spoken Urdu for Hindi and returns Devanagari.
 */
export async function transcribe(audio: Blob, lang: "ur" | "en"): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) return null;
  const form = new FormData();
  form.append("file", audio, "voice.webm");
  form.append("model", sttModel());
  form.append("language", lang);
  form.append("response_format", "json");
  form.append("temperature", "0");
  // Prompt biases spelling toward farming vocabulary.
  form.append("prompt", lang === "ur" ? "پمپ، پانی، بارش، گندم، کھاد، سولر، گھنٹے، ٹیوب ویل" : "pump, water, rain, wheat, fertiliser, solar, hours, tube well");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Groq STT HTTP ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}
