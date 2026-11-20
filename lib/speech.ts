/**
 * Client-side "read this aloud" for any line of text, in Urdu or English.
 * Order: neural voice from /api/tts (Azure, cached) → the phone's own voice → false (caller shows a message).
 * Only one thing speaks at a time; starting a new line stops the previous one.
 */
import type { Lang } from "@/lib/i18n/dict";

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** Urdu if the text contains Arabic-script letters, else English. */
export const langOf = (text: string): Lang => (ARABIC_SCRIPT.test(text) ? "ur" : "en");

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let token = 0;

export function stopSpeaking() {
  token++;
  audio?.pause();
  audio = null;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

async function neural(text: string, lang: Lang, mine: number, onEnd: () => void): Promise<boolean> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok || mine !== token) return false;
    const url = URL.createObjectURL(await res.blob());
    if (mine !== token) {
      URL.revokeObjectURL(url);
      return false;
    }
    objectUrl = url;
    const a = new Audio(url);
    audio = a;
    a.onended = onEnd;
    await a.play();
    return true;
  } catch {
    return false;
  }
}

function browserVoice(text: string, lang: Lang, onEnd: () => void): boolean {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return false;
  const voices = synth.getVoices();
  const voice =
    lang === "ur"
      ? voices.find((v) => v.lang.toLowerCase().startsWith("ur"))
      : (voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang.startsWith("en")));
  if (!voice) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  u.onend = onEnd;
  u.onerror = onEnd;
  synth.cancel();
  synth.speak(u);
  return true;
}

/** Speaks `text`. Resolves true once audio starts, false if no voice is available. `onEnd` fires when it finishes. */
export async function speak(text: string, onEnd: () => void = () => {}): Promise<boolean> {
  stopSpeaking();
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 1500);
  if (!clean) return false;
  const mine = token;
  const lang = langOf(clean);
  if (await neural(clean, lang, mine, onEnd)) return true;
  if (mine !== token) return false;
  return browserVoice(clean, lang, onEnd);
}
