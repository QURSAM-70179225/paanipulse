"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, X } from "lucide-react";
import { translateFixed, type Lang } from "@/lib/i18n/dict";
import { speak, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

/**
 * "Listen" mode for farmers who can't read: a big floating button on every page.
 * When it's on, every line shows a 🔊 mark (CSS in globals.css) and tapping any line reads it aloud in Urdu or English.
 * Buttons and links are read on the first tap and pressed on the second tap, so nothing happens by accident.
 */

const READABLE = "[data-speak],p,h1,h2,h3,h4,h5,h6,li,label,dt,dd,td,th,figcaption,blockquote,legend,option";
const INTERACTIVE = "a,button,select,summary,input,textarea,[role=button],[role=link],[role=tab],[role=checkbox],[role=switch],[role=radio]";
const TYPING = /^(text|search|email|tel|url|number|password|date|time)$/;
const SECOND_TAP_MS = 8000;
const STORE = { on: "pp_listen", voice: "pp_listen_voice" };

type Labels = { start: string; stop: string; hint: string; voice: string; unavailable: string };

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

function textOf(el: HTMLElement): string {
  const own = el.getAttribute("data-speak") ?? "";
  if (own) return own;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const label = el.labels?.[0]?.innerText ?? el.getAttribute("aria-label") ?? "";
    const value = el instanceof HTMLSelectElement ? (el.selectedOptions[0]?.text ?? "") : el.type === "password" ? "" : el.value;
    const hint = "placeholder" in el ? el.placeholder : "";
    return [label, value || hint].filter(Boolean).join(" — ");
  }
  return (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim();
}

/** The element a tap should read: a marked line, else a short leaf element (spans/divs holding plain text). */
function targetOf(start: HTMLElement): HTMLElement | null {
  const line = start.closest<HTMLElement>(READABLE);
  if (line) return line;
  let el: HTMLElement | null = start;
  while (el && el !== document.body) {
    const t = el.innerText?.trim() ?? "";
    if (t && t.length <= 400) return el;
    el = el.parentElement;
  }
  return null;
}

export function ListenMode({ lang, labels, className }: { lang: Lang; labels: Labels; className?: string }) {
  const [on, setOn] = useState(false);
  const [voice, setVoice] = useState<Lang>(lang);
  const [note, setNote] = useState<string | null>(null);
  const speaking = useRef<HTMLElement | null>(null);
  const last = useRef<{ el: Element; at: number } | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setOn(read(STORE.on) === "1");
    const v = read(STORE.voice);
    if (v === "ur" || v === "en") setVoice(v);
  }, []);

  const unmark = () => {
    speaking.current?.removeAttribute("data-speaking");
    speaking.current = null;
  };

  const flash = useCallback((msg: string) => {
    setNote(msg);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 4000);
  }, []);

  const sayEl = useCallback(
    async (el: HTMLElement) => {
      const raw = textOf(el);
      if (!raw) return;
      const text = translateFixed(raw, voice) ?? raw;
      unmark();
      el.setAttribute("data-speaking", "");
      speaking.current = el;
      const ok = await speak(text, () => {
        if (speaking.current === el) unmark();
      });
      if (!ok && speaking.current === el) {
        unmark();
        flash(labels.unavailable);
      }
    },
    [voice, flash, labels.unavailable],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (!on) {
      delete root.dataset.listen;
      return;
    }
    root.dataset.listen = "on";
    const onClick = (e: MouseEvent) => {
      const start = e.target as HTMLElement | null;
      if (!start || start.closest("[data-listen-ui]")) return;
      const control = start.closest<HTMLElement>(INTERACTIVE);
      if (control) {
        const typing = (control instanceof HTMLInputElement && TYPING.test(control.type)) || control instanceof HTMLTextAreaElement;
        const prev = last.current;
        if (typing || (prev && prev.el === control && Date.now() - prev.at < SECOND_TAP_MS)) {
          last.current = null;
          if (typing) void sayEl(control);
          else stopSpeaking();
          return; // let the press happen
        }
        e.preventDefault();
        e.stopPropagation();
        last.current = { el: control, at: Date.now() };
        void sayEl(control);
        return;
      }
      const el = targetOf(start);
      if (!el) return;
      last.current = null;
      if (speaking.current === el) {
        stopSpeaking();
        unmark();
        return;
      }
      void sayEl(el);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      delete root.dataset.listen;
    };
  }, [on, sayEl]);

  useEffect(() => () => stopSpeaking(), []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    write(STORE.on, next ? "1" : "0");
    stopSpeaking();
    unmark();
    last.current = null;
    if (next) void speak(translateFixed(labels.hint, voice) ?? labels.hint);
  };

  const pickVoice = (v: Lang) => {
    setVoice(v);
    write(STORE.voice, v);
  };

  return (
    <div data-listen-ui dir={lang === "ur" ? "rtl" : "ltr"} className={cn("no-print fixed bottom-4 start-4 z-[1001] flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2", className)}>
      {on && (
        <div className="w-72 max-w-full rounded-2xl bg-white p-3 text-sm text-slate-800 shadow-xl ring-1 ring-slate-200">
          <p className={cn("font-medium", lang === "ur" && "urdu")}>{note ?? labels.hint}</p>
          <div role="group" aria-label={labels.voice} className="mt-2 flex items-center gap-2">
            <span className={cn("text-xs text-slate-500", lang === "ur" && "urdu")}>{labels.voice}</span>
            {(["ur", "en"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => pickVoice(v)}
                aria-pressed={voice === v}
                className={cn(
                  "min-h-9 rounded-full px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                  voice === v ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  v === "ur" && "urdu leading-none",
                )}
              >
                {v === "ur" ? "اردو" : "English"}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? labels.stop : labels.start}
        className={cn(
          "inline-flex min-h-14 items-center gap-2 rounded-full px-5 text-lg font-bold shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300",
          on ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-emerald-700 text-white hover:bg-emerald-600",
        )}
      >
        {on ? <X className="h-6 w-6" aria-hidden /> : <Volume2 className="h-6 w-6" aria-hidden />}
        <span className={cn(lang === "ur" && "urdu leading-none")}>{on ? labels.stop : labels.start}</span>
      </button>
    </div>
  );
}
