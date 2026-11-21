"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Timer, TimerOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { More } from "@/components/ui/more";
import { chime, startAlarm, stopAlarm, unlockAudio } from "@/lib/alarm";
import { queueReport, timerKey } from "@/lib/offline";
import { cn } from "@/lib/utils";

interface TimerState { startedAt: number; endsAt: number; hours: number }

export interface PumpTimerLabels {
  title: string; help: string; hours: string; start: string; left: string; stop: string; offNow: string; done: string;
  soon: string; keepOpen: string; noNeed: string; saved: string; unit: string;
  more: string; boxHint: string;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function load(farmId: string): TimerState | null {
  try {
    const raw = localStorage.getItem(timerKey(farmId));
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    return null;
  }
}

/** Farmer-started pump timer. Rings a loud alarm when the advised hours are over. All client-side, so it works offline. */
export function PumpTimer({ farmId, recommendedHours, adviceIsOff, listen, labels }: { farmId: string; recommendedHours: number; adviceIsOff: boolean; listen?: React.ReactNode; labels: PumpTimerLabels }) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hours, setHours] = useState(recommendedHours > 0 ? recommendedHours : 2);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const warned = useRef(false);
  const notified = useRef(false);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    setTimer(load(farmId));
    const id = setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      stopAlarm();
      void wake.current?.release();
    };
  }, [farmId]);

  const remaining = timer ? timer.endsAt - now : 0;
  const ringing = !!timer && remaining <= 0;

  // 5-minute reminder, then the alarm.
  useEffect(() => {
    if (!timer) return;
    if (!ringing && remaining <= 300_000 && remaining > 0 && !warned.current && timer.hours * 3_600_000 > 600_000) {
      warned.current = true;
      chime();
    }
    if (ringing) {
      startAlarm();
      if (!notified.current) {
        notified.current = true;
        void showNotification(labels.offNow, labels.title);
      }
    }
  }, [timer, ringing, remaining, labels.offNow, labels.title]);

  async function requestWake() {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wake.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      /* not supported */
    }
  }

  function begin() {
    unlockAudio(); // must happen inside the tap so the browser allows sound later
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    const t: TimerState = { startedAt: Date.now(), endsAt: Date.now() + hours * 3_600_000, hours };
    try {
      localStorage.setItem(timerKey(farmId), JSON.stringify(t));
    } catch {
      /* ignore */
    }
    warned.current = false;
    notified.current = false;
    setSavedMsg(null);
    setTimer(t);
    setNow(Date.now());
    void requestWake();
  }

  function clear() {
    stopAlarm();
    void wake.current?.release();
    try {
      localStorage.removeItem(timerKey(farmId));
    } catch {
      /* ignore */
    }
    setTimer(null);
  }

  async function finished() {
    if (!timer) return;
    const ran = Math.min(14, Math.max(0.25, Math.round(((Date.now() - timer.startedAt) / 3_600_000) * 4) / 4));
    clear();
    setSavedMsg(labels.saved.replace("{h}", String(ran)));
    try {
      const res = await fetch(`/api/farms/${farmId}/hours`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours: ran, daysAgo: 0, add: true }) });
      if (!res.ok && res.status >= 500) throw new Error("server");
    } catch {
      queueReport({ farmId, hours: ran, daysAgo: 0, add: true }); // no internet: send later
    }
  }

  return (
    <>
      <Card className={cn(timer && !ringing && "border-emerald-400")}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5 text-emerald-700" aria-hidden /> {labels.title}</CardTitle>
            <div className="shrink-0">{listen}</div>
          </div>
          <More label={labels.more}>
            <p>{labels.help}</p>
            <p>{labels.boxHint}</p>
          </More>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {timer ? (
            <>
              <p className="text-xs font-medium text-slate-600">{labels.left}</p>
              <p className="num text-4xl font-bold tabular-nums text-emerald-800" aria-live="off"><bdi dir="ltr">{fmt(remaining)}</bdi></p>
              <p className="text-xs text-slate-500">{labels.keepOpen}</p>
              <button type="button" onClick={clear} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 hover:bg-slate-50">
                <TimerOff className="h-4 w-4" aria-hidden /> {labels.stop}
              </button>
            </>
          ) : (
            <>
              {adviceIsOff && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{labels.noNeed}</p>}
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                {labels.hours}
                <div className="flex flex-wrap gap-2">
                  {[...(recommendedHours > 0 ? [recommendedHours] : []), 1, 2, 3, 4, 6].filter((v, i, a) => a.indexOf(v) === i).map((h) => (
                    <button key={h} type="button" onClick={() => setHours(h)} aria-pressed={hours === h}
                      className={cn("num h-11 min-w-12 rounded-xl border-2 px-3 font-bold", hours === h ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-800")}>
                      {h}
                    </button>
                  ))}
                  <input type="number" inputMode="decimal" min={0.5} max={12} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label={labels.hours}
                    className="num h-11 w-20 rounded-xl border border-slate-300 px-2 text-center" />
                </div>
              </label>
              <button type="button" onClick={begin} disabled={!(hours > 0)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                <BellRing className="h-5 w-5" aria-hidden /> {labels.start}
              </button>
              {savedMsg && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{savedMsg}</p>}
            </>
          )}
        </CardContent>
      </Card>

      {ringing && (
        <div role="alertdialog" aria-live="assertive" aria-label={labels.offNow} className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-6 bg-red-700 p-6 text-center text-white">
          <BellRing className="h-20 w-20 animate-bounce" aria-hidden />
          <p className="text-4xl font-extrabold leading-snug">{labels.offNow}</p>
          <button type="button" onClick={finished} className="h-16 w-full max-w-sm rounded-2xl bg-white text-xl font-bold text-red-800 shadow-lg">
            {labels.done}
          </button>
        </div>
      )}
    </>
  );
}

async function showNotification(title: string, body: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const opts = { body, tag: "pump-timer", requireInteraction: true, vibrate: [300, 150, 300, 150, 600] } as NotificationOptions;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {
    /* notifications unavailable */
  }
}
