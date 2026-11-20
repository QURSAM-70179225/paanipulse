import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, BatteryCharging, CalendarClock, CloudRain, Droplets, Flame, Gauge, History, Leaf, MessageCircle,
  Ruler, Waves,
  PowerOff, Radio, Sprout, Sun, Thermometer, Wheat, Zap, Coins, Info, CircleAlert, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { canAccessFarm, getSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/token";
import { AccountBar } from "@/components/auth/AccountBar";
import { getFarmState, type FarmState } from "@/lib/services/farmState";
import { CROP_NAMES } from "@/lib/services/advisoryText";
import { dirFor, isLang, t, type DictKey, type Lang } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PumpChart } from "@/components/farmer/PumpChart";
import { BucketTest } from "@/components/farmer/BucketTest";
import { LiveMeter } from "@/components/farmer/LiveMeter";
import { SoilNow } from "@/components/farmer/SoilNow";
import { FertiliserPlan } from "@/components/farmer/FertiliserPlan";
import { areaText } from "@/lib/i18n/area";
import { ProbeConnect } from "@/components/farmer/ProbeConnect";
import { PumpControl } from "@/components/farmer/PumpControl";
import { pumpControlAvailable } from "@/lib/services/pumpControl";
import { ReportHours } from "@/components/farmer/ReportHours";
import { FieldCheck } from "@/components/farmer/FieldCheck";
import { fieldCheckSummary } from "@/lib/services/fieldCheck";
import { dictFor } from "@/lib/i18n/dict";
import { LanguageToggle } from "@/components/LanguageToggle";
import { VoicePlayer } from "@/components/VoicePlayer";
import { cn } from "@/lib/utils";
import { type Condition } from "@/lib/weatherCode";
import { WeatherLive } from "@/components/farmer/WeatherLive";
import { OfflineSnapshot } from "@/components/farmer/OfflineSnapshot";
import { PumpTimer } from "@/components/farmer/PumpTimer";

export const dynamic = "force-dynamic";

const n0 = (x: number) => Math.round(x).toLocaleString("en-US");
const hrs = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));

type TFn = (k: DictKey, v?: Record<string, string | number>) => string;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Farm ${id} · PaaniPulse` };
}

export default async function FarmPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ probe?: string }> }) {
  const { id } = await params;
  const showProbe = (await searchParams).probe === "1";
  const user = await getSession();
  if (!user || !(await canAccessFarm(user, id))) notFound();
  const farmLang = (await prisma.farm.findUnique({ where: { id }, select: { language: true } }))?.language;
  const lang = await getLang(isLang(farmLang) ? farmLang : "ur");
  const s = await getFarmState(id);
  const hasSoilProbe = (await prisma.soilReading.count({ where: { farmId: id } })) > 0;
  if (!s) notFound();
  const T: TFn = (k, v) => t(lang, k, v);
  const ur = lang === "ur";
  const locale = ur ? "ur-PK" : "en-GB";
  const L = (m3: number) => `${n0(m3 * 1000)} ${T("litres")}`;
  const fc = await fieldCheckSummary(id);

  return (
    <main dir={dirFor(lang)} className={cn("mx-auto min-h-screen max-w-md bg-slate-50 pb-10", ur && "ur-ui")}>
      <OfflineSnapshot
        labels={{ offline: T("offlineBanner"), pending: T("queuedPending") }}
        snapshot={{
          v: 1, farmId: s.farm.id, savedAt: new Date().toISOString(), name: s.farm.farmerName, lang, kind: s.today.advice.kind,
          hoursToday: s.today.advice.hoursToday, daysUntilNext: s.today.advice.daysUntilNext, tempC: s.weatherNow?.tempC ?? null,
          tMax: s.forecast[0]?.tMax ?? null, tMin: s.forecast[0]?.tMin ?? null, rainTomorrowMm: s.forecast[1]?.precipMm ?? 0,
          texts: { ur: s.advisory.textUrdu, roman: s.advisory.textRomanUrdu, en: s.advisory.textEnglish },
        }}
      />
      <Header s={s} T={T} lang={lang} user={user} />
      <div className="flex flex-col gap-4 px-4 pt-4">
        {!s.yesterdayReported && !s.pump.hasTelemetry && (
          <ReportHours
            farmId={s.farm.id}
            labels={{ title: T("reportTitle"), help: T("reportHelp"), other: T("reportOther"), save: T("reportSave"), thanks: T("reportThanks"), hours: T("hours"), error: T("errGeneric"), queued: T("queuedSaved") }}
          />
        )}
        {s.yesterday && s.yesterday.actualHours > 0 && <YesterdayCard s={s} T={T} L={L} />}
        <HeroCard s={s} T={T} ur={ur} />
        {pumpControlAvailable() && s.pump.controlEnabled && (
          <PumpControl
            farmId={s.farm.id}
            advisedHours={s.today.advice.kind === "irrigate" ? s.today.advice.hoursToday : 0}
            labels={{
              title: T("pumpCtlTitle"), on: T("pumpCtlOn"), off: T("pumpCtlOff"), left: T("pumpCtlLeft"), offline: T("pumpCtlOffline"), never: T("pumpCtlNever"),
              hours: T("pumpCtlHours"), start: T("pumpCtlStart"), stop: T("pumpCtlStop"), confirm: T("pumpCtlConfirm"), auto: T("pumpCtlAuto"), autoNote: T("pumpCtlAutoNote"),
              safety: T("pumpCtlSafety"), errOffline: T("pumpCtlErrOffline"), errBusy: T("pumpCtlErrBusy"), errHours: T("pumpCtlErrHours"), errDisabled: T("pumpCtlErrDisabled"),
              errGeneric: T("errGeneric"), log: T("pumpCtlLog"),
              actions: { start: T("pumpLogStart"), stop: T("pumpLogStop"), "auto-stop-on": T("pumpLogAutoOn"), "auto-stop-off": T("pumpLogAutoOff"), enable: T("pumpLogEnable"), disable: T("pumpLogDisable") },
              actors: { farmer: T("pumpActorFarmer"), installer: T("pumpActorInstaller"), "auto-full": T("pumpActorAuto"), timer: T("pumpActorTimer") },
            }}
          />
        )}
        <PumpTimer
          farmId={s.farm.id}
          recommendedHours={s.today.advice.kind === "irrigate" ? s.today.advice.hoursToday : 0}
          adviceIsOff={s.today.advice.kind !== "irrigate"}
          labels={{
            title: T("timerTitle"), help: T("timerHelp"), hours: T("timerHours"), start: T("timerStart"), left: T("timerLeft"), stop: T("timerStop"),
            offNow: T("timerOffNow"), done: T("timerDone"), soon: T("timerSoon"), keepOpen: T("timerKeepOpen"), noNeed: T("timerNoNeed"), saved: T("timerSaved"), unit: T("hours"),
          }}
        />
        <TodayStats s={s} T={T} L={L} />
        <PumpOutputCard s={s} T={T} ur={ur} />
        <LiveMeter
          farmId={s.farm.id}
          initialHasTelemetry={s.pump.hasTelemetry}
          limitHours={s.today.advice.kind === "irrigate" ? s.today.advice.hoursToday : 0}
          labels={{
            title: T("liveTitle"), waiting: T("liveWaiting"), today: T("liveToday"), now: T("liveNow"), energy: T("liveEnergy"),
            runHours: T("liveRunHours"), updated: T("liveUpdated"), noHardware: T("liveNoHardware"), off: T("liveOff"),
            litres: T("litres"), hours: T("hours"), kwh: T("kwh"),
            overrunTitle: T("overrunTitle"), overrunNone: T("overrunNone"), overrunHours: T("overrunHours"), soundOn: T("alarmSoundOn"), soundOff: T("alarmSoundOff"),
          }}
        />
        {(hasSoilProbe || showProbe) && (
          <ProbeConnect
            farmId={s.farm.id}
            hasReadings={hasSoilProbe}
            labels={{
              title: T("probeTitle"), intro: T("probeIntro"), connect: T("probeConnect"), connecting: T("probeConnecting"), disconnect: T("probeDisconnect"),
              connected: T("probeConnected"), live: T("probeLive"), unsupported: T("probeUnsupported"), uploaded: T("probeUploaded"), waiting: T("probeWaiting"),
              notFound: T("probeNotFound"), lost: T("probeLost"), prototype: T("probePrototype"), history: T("probeHistory"),
            }}
          />
        )}
        {hasSoilProbe && (
          <SoilNow
            farmId={s.farm.id}
            labels={{
              title: T("soilTitle"), moisture: T("soilProbeMoisture"), dry: T("soilDry"), ok: T("soilOk"), wet: T("soilWet"), temp: T("soilTemp"),
              salinity: T("soilSalinity"), salinityHigh: T("soilSalinityHigh"), salinityNormal: T("soilSalinityNormal"),
              nutrients: T("soilNutrients"), nutrientsNote: T("soilNutrientsNote"), simulated: T("soilSimulated"), updated: T("soilUpdated"),
              stale: T("soilStale"), agree: T("soilAgree"), sensorWetter: T("soilSensorWetter"), sensorDrier: T("soilSensorDrier"),
              secondOpinion: T("soilSecondOpinion"), chartAria: T("soilChartAria"), zoneDry: T("soilZoneDry"), zoneWet: T("soilZoneWet"),
              filled: T("soilFilled"), filledNote: T("soilFilledNote"),
            }}
          />
        )}
        <WeekCard s={s} T={T} L={L} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5 text-sky-700" aria-hidden /> {T("last7")}</CardTitle>
            <p className="text-sm text-slate-600">{T("last7Sub")}</p>
          </CardHeader>
          <CardContent>
            <PumpChart
              data={s.chart}
              locale={locale}
              labels={{ pumped: T("pumped"), needed: T("cropNeeded"), wasted: T("wasted"), litres: T("litres"), aria: T("last7Sub") }}
            />
          </CardContent>
        </Card>
        <SpareSunCard s={s} T={T} ur={ur} />
        <FertiliserPlan
          farmId={s.farm.id}
          areaLabel={areaText(s.farm.areaAcres, s.farm.areaUnit, T)}
          fert={s.fert}
          labels={{
            title: T("fertTitle"), intro: T("fertIntro"), enter: T("fertEnter"), change: T("fertChange"), cancel: T("fertCancel"), save: T("fertSave"),
            urea: T("fertUrea"), dap: T("fertDap"), sop: T("fertSop"), perAcre: T("fertPerAcre"), splits: T("fertSplits"), splitsN: T("fertSplitsN"), splitsOne: T("fertSplitsOne"), bagsShort: T("fertBagsShort"),
            source: T("fertSource"), srcSoil: T("fertSrcSoil"), srcOfficer: T("fertSrcOfficer"), srcOther: T("fertSrcOther"), confirm: T("fertConfirm"),
            tooHigh: T("fertTooHigh"), empty: T("fertEmpty"), error: T("errGeneric"), totals: T("fertTotals"), bags: T("fertBags"), schedule: T("fertSchedule"),
            atSowing: T("fertAtSowing"), dose: T("fertDose"), markApplied: T("fertMarkApplied"), undo: T("fertUndo"), applied: T("fertApplied"),
            hintApply: T("fertHintApply"), hintRain: T("fertHintRain"), hintWait: T("fertHintWait"), hintDone: T("fertHintDone"),
            disclaimer: T("fertDisclaimer"), savedBy: T("fertSavedBy"),
          }}
        />
        <BucketTest
          farmId={s.farm.id}
          efficiency={s.pump.efficiency}
          calibrated={s.pump.calibrated}
          labels={{
            title: T("bucketTitle"), intro: T("bucketIntro"), volume: T("bucketVolume"), seconds: T("bucketSeconds"), hour: T("bucketHour"),
            submit: T("bucketSubmit"), result: T("bucketResult"), reset: T("bucketReset"), error: T("bucketError"),
            efficiencyNow: T("efficiencyNow"), inverter: T("fcInverter"), calibrated: T("calibrated"), defaultEstimate: T("defaultEstimate"),
          }}
        />
        <FieldCheck farmId={s.farm.id} d={dictFor(lang)} initial={{ ...fc, checks: fc.checks.map((c) => ({ ...c, takenAt: c.takenAt.toISOString() })) }} />
        <WeatherCard s={s} T={T} locale={locale} />
        <Link href={`/farmer/${s.farm.id}/chat`} className={cn(buttonVariants({ size: "lg" }), "w-full bg-[#128C7E] hover:bg-[#0e7266]")}>
          <MessageCircle className="h-5 w-5" aria-hidden /> {T("askAssistant")}
        </Link>
        <footer className="flex flex-col gap-2 pt-2 text-xs text-slate-600">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {T("methodNote", { head: s.headM.toFixed(0), kpm: s.kwhPerM3.toFixed(2) })}{" "}
              <Link href="/about" className="font-semibold text-sky-800 underline">{T("howWeCalculate")}</Link>
            </span>
          </p>
          <p>{T("consent")}</p>
          <Link href={`/report/${s.farm.id}`} className="font-semibold text-sky-800 underline">{T("openReportLink")}</Link>
          {!(hasSoilProbe || showProbe) && (
            <Link href={`/farmer/${s.farm.id}?probe=1`} className="inline-flex min-h-10 items-center font-semibold text-sky-800 underline">{T("probeLink")}</Link>
          )}
        </footer>
      </div>
    </main>
  );
}

function Header({ s, T, lang, user }: { s: FarmState; T: TFn; lang: Lang; user: SessionUser }) {
  const crop = CROP_NAMES[s.farm.crop];
  const ur = lang === "ur";
  return (
    <header className="bg-gradient-to-br from-emerald-800 to-teal-700 px-4 pb-5 pt-4 text-white">
      <div className="flex items-center justify-between gap-2">
        <Link href={user.role === "INSTALLER" ? "/installer" : "/"} className="inline-flex min-h-9 items-center gap-1 text-sm text-emerald-100 hover:text-white">
          <ArrowLeft className={cn("h-4 w-4", ur && "rotate-180")} aria-hidden /> {T("appName")}
        </Link>
        <LanguageToggle lang={lang} />
      </div>
      <AccountBar user={user} signOutLabel={T("signOut")} className="mt-2 justify-between text-emerald-50" />
      <h1 className="mt-2 text-2xl font-bold">{s.farm.farmerName}</h1>
      <p className="text-emerald-50">{s.farm.tehsil ? `${s.farm.tehsil}, ` : ""}{s.farm.district}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-emerald-50">
        <span className="inline-flex items-center gap-1"><Wheat className="h-4 w-4" aria-hidden /> {ur ? crop.ur : crop.en}</span>
        <span className="inline-flex items-center gap-1"><Sprout className="h-4 w-4" aria-hidden /> {T("day")} <span className="num">{s.today.daysSinceSowing}</span></span>
        <span className="num">{areaText(s.farm.areaAcres, s.farm.areaUnit, T)}</span>
        <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4" aria-hidden /> <bdi dir="ltr" className="num">{s.pump.ratedKw} kW · {s.pump.pvKwp} kWp</bdi></span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {s.dataSource === "telemetry" ? (
          <Badge variant="info"><Radio className="h-3 w-3" aria-hidden /> {T("telemetry")}</Badge>
        ) : (
          <Badge variant="info"><Sun className="h-3 w-3" aria-hidden /> {T("fromSunlight")}</Badge>
        )}
        {s.weatherSource === "live" && <Badge>{T("liveWeather")}</Badge>}
        {s.weatherSource === "openweather" && <Badge variant="warning">{T("wxOpenWeather")}</Badge>}
        {s.weatherSource === "cached-live" && <Badge variant="warning">{T("savedWeather")}</Badge>}
        {s.weatherSource === "sample" && <Badge variant="warning"><CircleAlert className="h-3 w-3" aria-hidden /> {T("sampleWeather")}</Badge>}
        <Badge variant="outline" className="border-white/50 text-white">{s.farm.isSynthetic ? T("simulated") : T("demoFarm")}</Badge>
      </div>
    </header>
  );
}

function YesterdayCard({ s, T, L }: { s: FarmState; T: TFn; L: (m3: number) => string }) {
  const y = s.yesterday!;
  const over = y.neededHours <= 0 || y.actualHours > y.neededHours;
  return (
    <Card className={over ? "border-amber-300 bg-amber-50" : ""}>
      <CardContent className="flex gap-3 pt-5">
        <History className="mt-1 h-6 w-6 shrink-0 text-amber-700" aria-hidden />
        <div>
          <p className="text-base font-semibold text-slate-900">{T("yesterdayLine", { actual: hrs(y.actualHours), needed: hrs(y.neededHours) })}</p>
          <p className="text-sm text-slate-700">{T("yesterdaySub", { litres: L(y.pumpedM3) })}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroCard({ s, T, ur }: { s: FarmState; T: TFn; ur: boolean }) {
  const a = s.today.advice;
  const style = a.kind === "irrigate" ? "from-emerald-700 to-emerald-600" : a.kind === "skip-rain" ? "from-indigo-700 to-sky-700" : "from-sky-800 to-sky-600";
  const Icon = a.kind === "irrigate" ? Droplets : a.kind === "skip-rain" ? CloudRain : PowerOff;
  const headline = a.kind === "irrigate" ? T("adviceIrrigate", { h: hrs(a.hoursToday) }) : a.kind === "skip-rain" ? T("adviceSkipRain") : T("adviceKeepOff");
  const next = a.daysUntilNext;
  return (
    <section aria-labelledby="today-advice" className={cn("rounded-2xl bg-gradient-to-br p-5 text-white shadow-md", style)}>
      <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white/80">
        <Icon className="h-5 w-5" aria-hidden /> {T("todayAdvice")}
      </p>
      <h2 id="today-advice" className="mt-2 text-3xl font-bold leading-snug">{headline}</h2>
      {s.criticalStage && (
        <p className="mt-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
          {T(a.kind === "irrigate" ? "criticalNow" : "criticalNext", { stage: ur ? s.criticalStage.ur : s.criticalStage.en })}
        </p>
      )}
      {a.kind === "irrigate" && a.totalHours > a.hoursToday && <p className="mt-2 text-sm text-white/90">{T("adviceRemainder", { total: hrs(a.totalHours) })}</p>}
      {a.kind === "irrigate" && s.waterPlan && s.waterPlan.grossMm > 0 && (
        <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-sm">
          <p className="font-semibold">{T("planTitle")}</p>
          <p className="mt-0.5">
            {T("planLine", {
              mm: Math.round(s.waterPlan.grossMm),
              ai: s.waterPlan.acreInches.toFixed(1),
              area: areaText(s.waterPlan.areaAcres, s.farm.areaUnit, T),
              m3: Math.round(s.waterPlan.totalM3).toLocaleString("en-US"),
              l: Math.round(s.waterPlan.totalM3 * 1000).toLocaleString("en-US"),
            })}
          </p>
          <p className="mt-1 text-xs text-white/80">{T("planNote")}</p>
        </div>
      )}
      {a.kind === "irrigate" && a.rainDeclined && (
        <p className="mt-2 rounded-xl bg-white/15 px-3 py-2 text-sm">{T(a.rainDeclined === "weather" ? "rainBetWeather" : "rainBetSafe")}</p>
      )}
      {a.kind !== "irrigate" && next !== null && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
          {next > 14 ? T("nextInWeeks", { n: Math.round(next / 7) }) : T("nextInDays", { n: next })}
        </p>
      )}
      <VoicePlayer
        className="mt-4"
        textUrdu={s.advisory.textUrdu}
        textRoman={s.advisory.textRomanUrdu}
        staticSrc={`/audio/advisory-${s.farm.id}.mp3`}
        label={T("playVoice")}
        stopLabel={T("stopVoice")}
        unavailableLabel={T("voiceUnavailable")}
      />
      <p className="mt-3 text-xs text-white/80">{T("soilMoisture", { used: Math.round(s.today.depletionStartMm), raw: Math.round(s.today.rawMm) })}</p>
      <ConfidenceLine s={s} T={T} />
    </section>
  );
}

const CONF_REASON_KEY = {
  "weather-sample": "confWeatherSample", "weather-cached": "confWeatherCached", "weather-estimated": "confWeatherEstimated",
  "pump-uncalibrated": "confPump", "hours-missing": "confHours", "rain-forecast": "confRain",
} as const;

/** How sure the advice is, and why not. The app is open loop (it advises, the farmer acts), so it says when its inputs are weak. */
function ConfidenceLine({ s, T }: { s: FarmState; T: TFn }) {
  const c = s.confidence;
  const Icon = c.level === "high" ? ShieldCheck : ShieldAlert;
  return (
    <div className={cn("mt-3 rounded-xl px-3 py-2 text-xs", c.level === "low" ? "bg-red-600/80" : "bg-white/15")}>
      <p className="flex items-center gap-1.5 font-semibold">
        <Icon className="h-4 w-4 shrink-0" aria-hidden /> {T("confTitle")} {T(c.level === "high" ? "confHigh" : c.level === "medium" ? "confMedium" : "confLow")}
      </p>
      {c.reasons.length > 0 && (
        <ul className="mt-1 list-disc ps-5 leading-6 text-white/90">
          {c.reasons.map((r) => <li key={r}>{T(CONF_REASON_KEY[r])}</li>)}
        </ul>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone = "text-slate-900" }: { icon: React.ElementType; label: string; value: string; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <Icon className="h-4 w-4 shrink-0" aria-hidden /> {label}
      </p>
      <p className={cn("num mt-1 text-lg font-bold leading-tight", tone)}>{value}</p>
      {sub && <div className="mt-0.5 text-xs text-slate-600">{sub}</div>}
    </div>
  );
}

function TodayStats({ s, T, L }: { s: FarmState; T: TFn; L: (m3: number) => string }) {
  const f = s.today.flowRange;
  const ur = T("litres") !== "L";
  const range = ur ? `${n0(f.low * 1000)} سے ${n0(f.high * 1000)} ${T("litres")}` : `${n0(f.low * 1000)}–${n0(f.high * 1000)} ${T("litres")}`;
  const rainTomorrow = s.forecast[1]?.precipMm ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-sky-700" aria-hidden /> {T("today")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Stat icon={Leaf} label={T("cropUsesToday")} value={L(s.today.cropUseM3)} sub={s.today.advice.kind === "irrigate" ? T("soilDrying") : T("fromSoil")} tone="text-emerald-800" />
        <Stat icon={CloudRain} label={T("rainTomorrow")} value={`${rainTomorrow.toFixed(1)} ${T("mm")}`} sub={rainTomorrow >= 2 ? T("rainLikely") : T("dry")} tone="text-indigo-800" />
        <Stat
          icon={Droplets}
          label={T("flowPerHour")}
          value={range}
          sub={<Badge variant={s.pump.calibrated ? "default" : "warning"} className="mt-1">{s.pump.calibrated ? T("calibrated") : T("defaultEstimate")}</Badge>}
        />
        <Stat icon={Sun} label={T("sunHours")} value={`${s.today.pumpableHours} ${T("hours")}`} sub={T("solarToday", { kwh: n0(s.today.pvKwh) })} tone="text-amber-700" />
      </CardContent>
    </Card>
  );
}

function WeekCard({ s, T, L }: { s: FarmState; T: TFn; L: (m3: number) => string }) {
  const w = s.week;
  const rs = w.wastedKwh * s.surplusRsPerKwh;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-red-700" aria-hidden /> {T("weekWaste")}</CardTitle>
        <p className="text-base text-slate-800">{w.overNeedPct > 5 ? T("pumpedMore", { pct: Math.round(w.overNeedPct) }) : T("pumpedOk")}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Stat icon={Droplets} label={T("lostBelowRoots")} value={L(w.excessM3)} sub={T("ofPumped", { pct: Math.round(w.excessPct) })} tone="text-red-700" />
        <Stat icon={Leaf} label={T("ureaWashed")} value={`${w.ureaKg.toFixed(1)} ${T("kg")}`} sub={`≈ ${T("rs")} ${n0(w.ureaRs)} · ${T("estimate")}`} tone="text-amber-800" />
        <Stat icon={Zap} label={T("solarOnWaste")} value={`${n0(w.wastedKwh)} ${T("kwh")}`} sub={T("solarOnWasteSub")} />
        <Stat icon={Coins} label={T("couldEarn")} value={`${T("rs")} ${n0(rs)}`} sub={T("atRate", { rate: s.surplusRsPerKwh })} tone="text-emerald-800" />
      </CardContent>
    </Card>
  );
}

function SpareSunCard({ s, T, ur }: { s: FarmState; T: TFn; ur: boolean }) {
  const kwh = n0(s.today.todaySpareKwh);
  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5 text-amber-600" aria-hidden /> {T("spareSun")}</CardTitle>
        <p className="text-sm text-slate-700">{s.today.advice.kind === "irrigate" ? T("spareAfterIrrigate", { kwh }) : T("spareKeepOff", { kwh })}</p>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {s.today.todaySpareIdeas.map((idea) => (
            <li key={idea.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
              <span className="flex items-center gap-2 text-sm">
                <BatteryCharging className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                {ur ? idea.labelUr : idea.labelEn}
              </span>
              <span className="num whitespace-nowrap text-base font-bold text-emerald-800">{T("rs")} {n0(idea.rs)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-600">{T("spareNote")}</p>
      </CardContent>
    </Card>
  );
}

function WeatherCard({ s, T, locale }: { s: FarmState; T: TFn; locale: string }) {
  const wd = (d: string) => new Date(`${d}T12:00:00+05:00`).toLocaleDateString(locale, { weekday: "short", timeZone: "Asia/Karachi" });
  const today = s.forecast[0];
  const conditions = Object.fromEntries((["clear", "partly", "cloudy", "fog", "drizzle", "rain", "storm", "snow"] as Condition[]).map((c) => [c, T(`wx${c}` as DictKey)])) as Record<Condition, string>;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Thermometer className="h-5 w-5 text-sky-700" aria-hidden /> {T("wxNowTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <WeatherLive
          farmId={s.farm.id}
          initial={{ source: s.weatherSource, current: s.weatherNow, hourly: s.weatherHourly }}
          today={{ tMax: today?.tMax ?? null, tMin: today?.tMin ?? null, precipMm: today?.precipMm ?? 0 }}
          labels={{
            feels: T("wxFeels", { t: "{t}" }), humidity: T("wxHumidity"), wind: T("wxWind"), rainToday: T("wxRainToday"), highLow: T("wxHighLow"),
            updated: T("wxUpdated", { t: "{t}" }), offline: T("wxOffline"), kmh: T("kmh"), mm: T("mm"), hourlyTitle: T("wxHourlyTitle"),
            rainChance: T("wxRainChance"), auto: T("wxAuto"), nowLabel: T("wxNowLabel"),
            sourceLive: T("liveWeather"), sourceSaved: T("savedWeather"), sourceSample: T("sampleWeather"), sourceOpenWeather: T("wxOpenWeather"), conditions,
          }}
        />

        <ul className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
          {s.forecast.map((d, i) => (
            <li key={d.date} className={cn("rounded-lg py-2", i === 0 ? "bg-sky-100" : "bg-slate-50")}>
              <p className="font-semibold leading-tight text-slate-800">{i === 0 ? T("todayShort") : i === 1 ? T("tomorrowShort") : wd(d.date)}</p>
              {d.precipMm >= 1 ? <CloudRain className="mx-auto my-1 h-5 w-5 text-indigo-700" aria-hidden /> : <Sun className="mx-auto my-1 h-5 w-5 text-amber-500" aria-hidden />}
              <p className="num font-bold text-slate-900">{d.tMax !== null ? `${Math.round(d.tMax)}°` : "–"}</p>
              <p className="num text-slate-600">{d.tMin !== null ? `${Math.round(d.tMin)}°` : "–"}</p>
              <p className={cn("num mt-1", d.precipMm >= 1 ? "font-semibold text-indigo-800" : "text-slate-500")}>{d.precipMm.toFixed(0)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-end text-xs text-slate-500">{T("mm")}</p>
      </CardContent>
    </Card>
  );
}

function PumpOutputCard({ s, T, ur }: { s: FarmState; T: TFn; ur: boolean }) {
  const o = s.today.output;
  if (o.mid.litresPerMin <= 0) return null;
  const r10 = (x: number) => Math.round(x / 10) * 10;
  const inch = (o.depthMm / 25.4).toFixed(0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Waves className="h-5 w-5 text-sky-700" aria-hidden /> {T("outTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Stat icon={Droplets} label={T("outPerMin")} value={`${n0(r10(o.low.litresPerMin))}${ur ? " سے " : "–"}${n0(r10(o.high.litresPerMin))} ${T("litres")}`} sub={`≈ ${n0(r10(o.mid.litresPerMin))} ${T("litres")}${ur ? " فی منٹ" : "/min"}`} tone="text-sky-800" />
        <Stat icon={Gauge} label={T("outPerHour")} value={`${n0(o.mid.m3PerHour)} m³`} sub={`≈ ${o.mid.cusec.toFixed(2)} ${T("cusec")}`} />
        <Stat icon={Ruler} label={T("outArea")} value={`${o.mid.kanalPerHour.toFixed(1)} ${T("kanal")}`} sub={`≈ ${o.mid.acresPerHour.toFixed(2)} ${T("acre")}`} tone="text-emerald-800" />
        <Stat icon={CalendarClock} label={T("outHoursPerAcre")} value={o.mid.hoursPerAcre ? `${o.mid.hoursPerAcre.toFixed(1)} ${T("hours")}` : "–"} sub={`${s.farm.areaAcres} ${T("acres")}: ${o.mid.hoursPerAcre ? n0(o.mid.hoursPerAcre * s.farm.areaAcres) : "–"} ${T("hours")}`} />
        <p className="col-span-2 text-xs text-slate-500">{T("outNote", { mm: o.depthMm, inch })}</p>
      </CardContent>
    </Card>
  );
}
