"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { VoicePlayer } from "@/components/VoicePlayer";
import { GUIDE_VOICE } from "@/lib/services/appGuide";
import { cn } from "@/lib/utils";

type Labels = { play: string; stop: string; unavailable: string };

/**
 * The whole-app voice note. Urdu goes through VoicePlayer (neural voice, then /audio/guide-ur.mp3 if the team recorded one, then the browser voice).
 * English plays /audio/guide-en.mp3 if present, otherwise the browser's English voice.
 */
export function GuidePlayer({ lang, labels, className }: { lang: "ur" | "en"; labels: Labels; className?: string }) {
  if (lang === "ur") {
    return (
      <VoicePlayer
        textUrdu={GUIDE_VOICE.ur}
        textRoman={GUIDE_VOICE.roman}
        staticSrc="/audio/guide-ur.mp3"
        label={labels.play}
        stopLabel={labels.stop}
        unavailableLabel={labels.unavailable}
        className={className}
      />
    );
  }
  return <EnglishPlayer labels={labels} className={className} />;
}

function EnglishPlayer({ labels, className }: { labels: Labels; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const [bad, setBad] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(
    () => () => {
      audio.current?.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    },
    [],
  );
  const stop = () => {
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    setPlaying(false);
  };
  const speak = () => {
    const synth = window.speechSynthesis;
    const voice = synth?.getVoices().find((v) => v.lang === "en-IN") ?? synth?.getVoices().find((v) => v.lang.startsWith("en"));
    if (!synth || !voice) return false;
    const u = new SpeechSynthesisUtterance(GUIDE_VOICE.en);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.92;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    synth.cancel();
    synth.speak(u);
    return true;
  };
  const onClick = async () => {
    if (playing) return stop();
    setBad(false);
    setPlaying(true);
    try {
      const head = await fetch("/audio/guide-en.mp3", { method: "HEAD" });
      if (head.ok) {
        const a = new Audio("/audio/guide-en.mp3");
        audio.current = a;
        a.onended = () => setPlaying(false);
        await a.play();
        return;
      }
    } catch {
      /* fall through to the browser voice */
    }
    if (!speak()) {
      setPlaying(false);
      setBad(true);
    }
  };
  const Icon = playing ? Pause : Play;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={playing ? labels.stop : labels.play}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 font-semibold text-sky-900 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
      >
        <Icon className="h-5 w-5" aria-hidden />
        <span>{playing ? labels.stop : labels.play}</span>
      </button>
      {bad && <p className="text-xs opacity-90">{labels.unavailable}</p>}
    </div>
  );
}
