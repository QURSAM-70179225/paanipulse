"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, AlarmClock, Bell, BellOff, Clock, Droplets, Radio, Zap } from "lucide-react";
import { startAlarm, stopAlarm, unlockAudio } from "@/lib/alarm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface LiveLabels {
  title: string;
  waiting: string;
  today: string;
  now: string;
  energy: string;
  runHours: string;
  updated: string;
  noHardware: string;
  off: string;
  litres: string;
  hours: string;
  kwh: string;
  overrunTitle: string;
  overrunNone: string;
  overrunHours: string;
  soundOn: string;
  soundOff: string;
}

interface Live {
  hasTelemetry: boolean;
  readings?: number;
  todayLitres?: number;
  todayKwh?: number;
  runHours?: number;
  lastPowerKw?: number;
  lastFlowLph?: number;
  lastAt?: string | null;
}

const n0 = (x: number) => Math.round(x).toLocaleString("en-US");

/** Polls the live meter every 5 s; refreshes the page once when telemetry first appears (badge → "Telemetry"). */
export function LiveMeter({ farmId, initialHasTelemetry, limitHours, labels }: { farmId: string; initialHasTelemetry: boolean; limitHours: number; labels: LiveLabels }) {
  const router = useRouter();
  const [live, setLive] = useState<Live>({ hasTelemetry: initialHasTelemetry });
  const [display, setDisplay] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const seenTelemetry = useRef(initialHasTelemetry);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/farms/${farmId}/live`, { cache: "no-store" });
        if (!r.ok || !alive) return;
        const d: Live = await r.json();
        setLive(d);
        if (d.hasTelemetry && !seenTelemetry.current) {
          seenTelemetry.current = true;
          router.refresh();
        }
      } catch {
        /* keep last value */
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [farmId, router]);

  // Smoothly count the litres up to the latest value.
  useEffect(() => {
    const target = live.todayLitres ?? 0;
    if (target <= display) {
      setDisplay(target);
      return;
    }
    const step = Math.max(1, Math.ceil((target - display) / 25));
    const id = setInterval(() => setDisplay((v) => (v + step >= target ? (clearInterval(id), target) : v + step)), 40);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.todayLitres]);

  const on = (live.lastPowerKw ?? 0) > 0;
  // Over-run: the drive shows the pump running past the advised hours (or running at all on a "keep off" day).
  const ran = live.runHours ?? 0;
  const over = on && (limitHours <= 0 ? ran >= 0.25 : ran >= limitHours + 0.25);
  useEffect(() => {
    if (over && soundOn) startAlarm();
    else stopAlarm();
    return () => stopAlarm();
  }, [over, soundOn]);
  return (
    <Card className={cn(live.hasTelemetry ? "border-sky-300" : "border-dashed bg-slate-50")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className={cn("h-5 w-5", live.hasTelemetry ? "text-sky-700" : "text-slate-400")} aria-hidden /> {labels.title}
          {live.hasTelemetry && <span className={cn("ms-auto h-2.5 w-2.5 rounded-full", on ? "animate-pulse bg-emerald-500" : "bg-slate-400")} aria-hidden />}
        </CardTitle>
        {!live.hasTelemetry && <p className="text-sm text-slate-600">{labels.waiting}</p>}
        {live.hasTelemetry && (
          <button type="button" aria-pressed={soundOn} onClick={() => { if (!soundOn) unlockAudio(); setSoundOn(!soundOn); }}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
            {soundOn ? <Bell className="h-4 w-4 text-emerald-700" aria-hidden /> : <BellOff className="h-4 w-4" aria-hidden />} {soundOn ? labels.soundOn : labels.soundOff}
          </button>
        )}
      </CardHeader>
      {live.hasTelemetry && (
        <CardContent>
          {over && (
            <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-red-600 p-3 text-white">
              <AlarmClock className="mt-0.5 h-5 w-5 shrink-0 animate-pulse" aria-hidden />
              <div>
                <p className="font-bold">{labels.overrunTitle}</p>
                <p className="text-sm">{limitHours <= 0 ? labels.overrunNone : labels.overrunHours.replace("{ran}", ran.toFixed(1)).replace("{rec}", String(limitHours))}</p>
              </div>
            </div>
          )}
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><Droplets className="h-4 w-4" aria-hidden /> {labels.today}</p>
          <p className="num text-4xl font-bold tabular-nums text-sky-800" aria-live="polite">
            <bdi dir="ltr">{n0(display)}</bdi> <span className="text-xl">{labels.litres}</span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-slate-50 p-2">
              <Activity className="mx-auto h-4 w-4 text-sky-700" aria-hidden />
              <p className="text-slate-600">{labels.now}</p>
              <p className="num font-bold text-slate-900">{on ? <bdi dir="ltr">{n0(live.lastFlowLph ?? 0)} {labels.litres}/h</bdi> : labels.off}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <Zap className="mx-auto h-4 w-4 text-amber-600" aria-hidden />
              <p className="text-slate-600">{labels.energy}</p>
              <p className="num font-bold text-slate-900"><bdi dir="ltr">{(live.todayKwh ?? 0).toFixed(1)}</bdi> {labels.kwh}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <Clock className="mx-auto h-4 w-4 text-emerald-700" aria-hidden />
              <p className="text-slate-600">{labels.runHours}</p>
              <p className="num font-bold text-slate-900"><bdi dir="ltr">{(live.runHours ?? 0).toFixed(1)}</bdi> {labels.hours}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {labels.noHardware}
            {live.lastAt && <> · {labels.updated.replace("{t}", new Date(live.lastAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }))}</>}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
