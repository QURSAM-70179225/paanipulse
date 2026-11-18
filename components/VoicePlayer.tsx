"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "idle" | "loading" | "playing" | "unavailable";

/**
 * Plays an Urdu voice note with graceful fallbacks:
 *  1. Neural TTS from /api/tts (Azure ur-PK, cached server-side)
 *  2. A pre-recorded file (e.g. /audio/advisory-karamat.mp3 recorded by the team)
 *  3. Browser speechSynthesis (Urdu voice if installed; otherwise Roman Urdu with an English-India voice)
 *  4. Message telling the user to read the text
 */
export function VoicePlayer({
  textUrdu,
  textRoman,
  staticSrc,
  label,
  stopLabel,
  unavailableLabel,
  variant = "solid",
  className,
}: {
  textUrdu: string;
  textRoman: string;
  staticSrc?: string;
  label: string;
  stopLabel: string;
  unavailableLabel: string;
  variant?: "solid" | "bubble";
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    },
    [],
  );

  const playUrl = (url: string) =>
    new Promise<boolean>((resolve) => {
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => setState("idle");
      a.onerror = () => resolve(false);
      a.play().then(() => {
        setState("playing");
        resolve(true);
      }, () => resolve(false));
    });

  const tryNeural = async () => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textUrdu, lang: "ur" }),
      });
      if (!res.ok) return false;
      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      return playUrl(urlRef.current);
    } catch {
      return false;
    }
  };

  const tryStatic = async () => {
    if (!staticSrc) return false;
    try {
      const head = await fetch(staticSrc, { method: "HEAD" });
      if (!head.ok) return false;
      return playUrl(staticSrc);
    } catch {
      return false;
    }
  };

  const tryBrowser = () => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return false;
    const voices = synth.getVoices();
    const urdu = voices.find((v) => v.lang.toLowerCase().startsWith("ur"));
    const fallback = voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang.startsWith("en"));
    const u = new SpeechSynthesisUtterance(urdu ? textUrdu : textRoman);
    if (urdu) u.voice = urdu;
    else if (fallback) u.voice = fallback;
    else return false;
    u.lang = u.voice?.lang ?? "ur-PK";
    u.rate = 0.9;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    synth.cancel();
    synth.speak(u);
    setState("playing");
    return true;
  };

  const onClick = async () => {
    if (state === "playing") {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      setState("idle");
      return;
    }
    setState("loading");
    if (await tryNeural()) return;
    if (await tryStatic()) return;
    if (tryBrowser()) return;
    setState("unavailable");
  };

  const Icon = state === "loading" ? Loader2 : state === "playing" ? Pause : Play;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={state === "playing" ? stopLabel : label}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          variant === "solid" ? "bg-white text-sky-900 hover:bg-sky-50 focus-visible:ring-white" : "bg-transparent text-[#075E54]",
        )}
      >
        <Icon className={cn("h-5 w-5", state === "loading" && "animate-spin")} aria-hidden />
        <span>{state === "playing" ? stopLabel : label}</span>
        <span aria-hidden className="flex h-5 items-center gap-0.5" dir="ltr">
          {[6, 12, 8, 16, 10, 14, 7, 12, 9].map((h, i) => (
            <span
              key={i}
              className={cn("w-0.5 rounded-full", variant === "solid" ? "bg-sky-700" : "bg-[#075E54]", state === "playing" && "animate-pulse")}
              style={{ height: h }}
            />
          ))}
        </span>
      </button>
      {state === "unavailable" && <p className="text-xs opacity-90">{unavailableLabel}</p>}
    </div>
  );
}
