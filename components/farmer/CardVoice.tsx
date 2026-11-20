"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Loader2, Square, Volume2 } from "lucide-react";
import { VOICE_PICKED, type VoiceLang, type VoiceScript } from "@/lib/services/cardVoice";
import { cn } from "@/lib/utils";

/* ---------- chosen voice language: one choice for the whole dashboard, remembered on the phone ---------- */

const KEY = "pp_voice_lang";
const EVENT = "pp-voice-lang";
const isVoiceLang = (x: unknown): x is VoiceLang => x === "ur" || x === "en" || x === "pa";

function readChoice(): VoiceLang | null {
  try {
    const v = localStorage.getItem(KEY);
    return isVoiceLang(v) ? v : null;
  } catch {
    return null;
  }
}

function useVoiceLang(fallback: VoiceLang): VoiceLang {
  const chosen = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    readChoice,
    () => null,
  );
  return chosen ?? fallback;
}

function setVoiceLang(l: VoiceLang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  window.dispatchEvent(new Event(EVENT));
}

/* ---------- playback: one voice at a time across all cards ---------- */

let current: { audio?: HTMLAudioElement; url?: string; stop: () => void } | null = null;

function stopAll() {
  current?.stop();
  current = null;
}

const BROWSER_PREFIX: Record<VoiceLang, string> = { ur: "ur", en: "en", pa: "pa" };

function browserSpeak(text: string, prefix: string, onEnd: () => void): boolean {
  const synth = window.speechSynthesis;
  if (!synth) return false;
  const voices = synth.getVoices();
  const voice =
    prefix === "en"
      ? (voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang.toLowerCase().startsWith("en")))
      : voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (!voice) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  u.onend = onEnd;
  u.onerror = onEnd;
  synth.cancel();
  synth.speak(u);
  current = { stop: () => synth.cancel() };
  return true;
}

/**
 * Speaks a script in `lang`: neural voice from /api/tts, else the phone's own voice for that language,
 * else (Urdu/Punjabi) the Roman version with an English-India voice. Resolves false if nothing could speak.
 */
async function play(script: VoiceScript, lang: VoiceLang, onEnd: () => void): Promise<boolean> {
  stopAll();
  const text = script[lang];
  const token = (current = { stop: () => {} });
  try {
    const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
    if (res.ok && current === token) {
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.onended = onEnd;
      current = {
        audio,
        url,
        stop: () => {
          audio.pause();
          URL.revokeObjectURL(url);
        },
      };
      await audio.play();
      return true;
    }
  } catch {
    /* fall through to the phone's voice */
  }
  if (current !== token) return false; // another card started meanwhile
  if (browserSpeak(text, BROWSER_PREFIX[lang], onEnd)) return true;
  if (lang === "ur" && browserSpeak(script.urRoman, "en", onEnd)) return true;
  if (lang === "pa" && browserSpeak(script.paRoman, "en", onEnd)) return true;
  current = null;
  return false;
}

/* ---------- the per-card listen button ---------- */

type Labels = { listen: string; stop: string; unavailable: string };

export function CardVoice({
  script,
  pageLang,
  labels,
  tone = "light",
  className,
}: {
  script: VoiceScript;
  pageLang: "ur" | "en";
  labels: Labels;
  tone?: "light" | "dark";
  className?: string;
}) {
  const lang = useVoiceLang(pageLang);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "unavailable">("idle");

  useEffect(() => () => stopAll(), []);
  useEffect(() => {
    const onOther = () => setState((s) => (s === "playing" || s === "loading" ? "idle" : s));
    window.addEventListener("pp-voice-stop", onOther);
    return () => window.removeEventListener("pp-voice-stop", onOther);
  }, []);

  const onClick = async () => {
    if (state === "playing" || state === "loading") {
      stopAll();
      setState("idle");
      return;
    }
    window.dispatchEvent(new Event("pp-voice-stop")); // reset other cards' buttons
    setState("loading");
    const ok = await play(script, lang, () => setState("idle"));
    setState((s) => (s === "loading" ? (ok ? "playing" : "unavailable") : s));
  };

  const busy = state === "playing" || state === "loading";
  const Icon = state === "loading" ? Loader2 : state === "playing" ? Square : Volume2;
  return (
    <span className={cn("inline-flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={busy ? labels.stop : labels.listen}
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          tone === "dark"
            ? "bg-white text-emerald-900 hover:bg-emerald-50 focus-visible:ring-white"
            : busy
              ? "bg-amber-500 text-slate-900 hover:bg-amber-400 focus-visible:ring-amber-500"
              : "bg-emerald-700 text-white hover:bg-emerald-600 focus-visible:ring-emerald-600",
        )}
      >
        <Icon className={cn("h-5 w-5", state === "loading" && "animate-spin")} aria-hidden />
        <span>{busy ? labels.stop : labels.listen}</span>
      </button>
      {state === "unavailable" && <span className={cn("text-xs", tone === "dark" ? "text-white/90" : "text-slate-600")}>{labels.unavailable}</span>}
    </span>
  );
}

/* ---------- voice language picker (top of the dashboard) ---------- */

const NAMES: { id: VoiceLang; label: string; className?: string }[] = [
  { id: "ur", label: "اردو", className: "urdu leading-none" },
  { id: "pa", label: "پنجابی", className: "urdu leading-none" },
  { id: "en", label: "English" },
];

export function VoiceLangPicker({ pageLang, title }: { pageLang: "ur" | "en"; title: string }) {
  const lang = useVoiceLang(pageLang);
  const pickLang = (l: VoiceLang) => {
    setVoiceLang(l);
    window.dispatchEvent(new Event("pp-voice-stop"));
    void play(VOICE_PICKED, l, () => {});
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Volume2 className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden /> {title}
      </p>
      <div role="group" aria-label={title} dir="ltr" className="flex gap-1">
        {NAMES.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => pickLang(n.id)}
            aria-pressed={lang === n.id}
            className={cn(
              "min-h-11 rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
              lang === n.id ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              n.className,
            )}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}
