"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCheck, Mic, RotateCcw, SendHorizonal, Sprout } from "lucide-react";
import { VoicePlayer } from "@/components/VoicePlayer";
import { LanguageToggle } from "@/components/LanguageToggle";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

export interface ChatLabels {
  assistantName: string;
  online: string;
  typeMessage: string;
  send: string;
  dailyAdvisory: string;
  resetChat: string;
  aiOffline: string;
  thinking: string;
  backToFarm: string;
  playVoice: string;
  stopVoice: string;
  voiceUnavailable: string;
  quick: string[];
}

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

const hasUrdu = (s: string) => /[؀-ۿ]/.test(s);
const nowTime = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" });

export function ChatView({
  farmId,
  lang,
  labels,
  advisory,
  initial,
}: {
  farmId: string;
  lang: Lang;
  labels: ChatLabels;
  advisory: { textUrdu: string; textRomanUrdu: string; textEnglish: string; time: string };
  initial: Msg[];
}) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"ai" | "fallback" | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const ur = lang === "ur";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    const userMsg: Msg = { id: `u${Date.now()}`, role: "user", content: message, time: nowTime() };
    const botId = `a${Date.now()}`;
    setMsgs((m) => [...m, userMsg]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ farmId, message }) });
      setMode((res.headers.get("X-Chat-Mode") as "ai" | "fallback") ?? null);
      if (!res.ok || !res.body) throw new Error(String(res.status));
      setMsgs((m) => [...m, { id: botId, role: "assistant", content: "", time: nowTime() }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMsgs((m) => m.map((x) => (x.id === botId ? { ...x, content: x.content + chunk } : x)));
      }
    } catch {
      setMsgs((m) => [
        ...m.filter((x) => x.id !== botId),
        { id: botId, role: "assistant", content: ur ? "معاف کیجیے، ابھی جواب نہیں مل سکا۔ دوبارہ کوشش کریں۔" : "Sorry, I could not answer right now. Please try again.", time: nowTime() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    await fetch(`/api/chat?farmId=${encodeURIComponent(farmId)}`, { method: "DELETE" });
    setMsgs([]);
  }

  const advisoryText = ur ? advisory.textUrdu : advisory.textEnglish;

  return (
    <div className="flex h-dvh flex-col bg-[#ECE5DD]">
      <header className="flex items-center gap-2 bg-[#075E54] px-2 py-2 text-white">
        <Link href={`/farmer/${farmId}`} aria-label={labels.backToFarm} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
          <ArrowLeft className={cn("h-5 w-5", ur && "rotate-180")} aria-hidden />
        </Link>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-900">
          <Sprout className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{labels.assistantName}</p>
          <p className="text-xs text-emerald-100">{busy ? labels.thinking : labels.online}</p>
        </div>
        <button type="button" onClick={reset} aria-label={labels.resetChat} title={labels.resetChat} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
          <RotateCcw className="h-5 w-5" aria-hidden />
        </button>
        <LanguageToggle lang={lang} className="hidden min-[400px]:inline-flex" />
      </header>
      {mode === "fallback" && <p className="bg-amber-100 px-3 py-1 text-center text-xs text-amber-900">{labels.aiOffline}</p>}

      <div className="flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
        <ul className="flex flex-col gap-2">
          {/* Daily advisory: voice note + text, auto-posted first */}
          <li className="max-w-[85%] self-start">
            <div className="rounded-2xl rounded-ss-sm bg-white p-2 shadow-sm">
              <p className="px-1 text-xs font-semibold text-[#075E54]">{labels.dailyAdvisory}</p>
              <VoicePlayer
                variant="bubble"
                textUrdu={advisory.textUrdu}
                textRoman={advisory.textRomanUrdu}
                staticSrc={`/audio/advisory-${farmId}.mp3`}
                label={labels.playVoice}
                stopLabel={labels.stopVoice}
                unavailableLabel={labels.voiceUnavailable}
              />
            </div>
          </li>
          <Bubble role="assistant" time={advisory.time}>
            <p dir={hasUrdu(advisoryText) ? "rtl" : "ltr"} className={cn(hasUrdu(advisoryText) && "urdu")}>{advisoryText}</p>
            {ur && <p dir="ltr" className="mt-1 border-t border-slate-100 pt-1 text-sm text-slate-600">{advisory.textRomanUrdu}</p>}
          </Bubble>

          {msgs.map((m) => (
            <Bubble key={m.id} role={m.role} time={m.time}>
              {m.content ? (
                <>
                  <p dir={hasUrdu(m.content) ? "rtl" : "ltr"} className={cn("whitespace-pre-wrap", hasUrdu(m.content) && "urdu")}>{m.content}</p>
                  {m.role === "assistant" && !busy && (
                    <VoicePlayer
                      variant="bubble"
                      className="-mx-2"
                      textUrdu={m.content}
                      textRoman={m.content}
                      label={labels.playVoice}
                      stopLabel={labels.stopVoice}
                      unavailableLabel={labels.voiceUnavailable}
                    />
                  )}
                </>
              ) : (
                <p className="text-slate-500">{labels.thinking}</p>
              )}
            </Bubble>
          ))}
        </ul>
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto px-3 pb-2" aria-label="Quick questions">
        {labels.quick.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => send(q)}
            className={cn("min-h-10 shrink-0 rounded-full border border-[#128C7E]/40 bg-white px-3 text-sm text-[#075E54] shadow-sm hover:bg-emerald-50 disabled:opacity-50", hasUrdu(q) && "urdu leading-none")}
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2 bg-[#F0F0F0] px-2 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">{labels.typeMessage}</label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={labels.typeMessage}
          dir="auto"
          maxLength={500}
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-full border-0 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#128C7E]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label={labels.send}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-white hover:bg-[#0e7266] disabled:bg-[#128C7E]/60"
        >
          {input.trim() ? <SendHorizonal className={cn("h-5 w-5", ur && "rotate-180")} aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, time, children }: { role: "user" | "assistant"; time: string; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <li className={cn("max-w-[85%]", mine ? "self-end" : "self-start")}>
      <div className={cn("rounded-2xl px-3 pb-1 pt-2 text-[15px] text-slate-900 shadow-sm", mine ? "rounded-se-sm bg-[#DCF8C6]" : "rounded-ss-sm bg-white")}>
        {children}
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-slate-500" dir="ltr">
          {time}
          {mine && <CheckCheck className="h-4 w-4 text-sky-500" aria-label="read" />}
        </p>
      </div>
    </li>
  );
}
