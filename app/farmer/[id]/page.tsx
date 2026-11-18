import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, BatteryCharging, CalendarClock, CloudRain, Droplets, Flame, Gauge, History, Leaf, MessageCircle,
  PowerOff, Radio, Sprout, Sun, Thermometer, Wheat, Zap, Coins, Info, CircleAlert,
} from "lucide-react";
import { getFarmState, type FarmState } from "@/lib/services/farmState";
import { CROP_NAMES } from "@/lib/services/advisoryText";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PumpChart } from "@/components/farmer/PumpChart";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const n0 = (x: number) => Math.round(x).toLocaleString("en-US");
const litres = (m3: number) => `${n0(m3 * 1000)} L`;
const hrs = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));
const weekday = (d: string) => new Date(`${d}T12:00:00+05:00`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "Asia/Karachi" });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Farm ${id} · PaaniPulse` };
}

export default async function FarmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getFarmState(id);
  if (!s) notFound();
  const crop = CROP_NAMES[s.farm.crop];

  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 pb-10">
      <Header s={s} crop={crop} />
      <div className="flex flex-col gap-4 px-4 pt-4">
        {s.yesterday && s.yesterday.actualHours > 0 && <YesterdayCard s={s} />}
        <HeroCard s={s} />
        <TodayStats s={s} />
        <WeekCard s={s} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5 text-sky-700" aria-hidden /> Pichle 7 din · Last 7 days</CardTitle>
            <p className="text-sm text-slate-600">Water pumped vs what the crop needed</p>
          </CardHeader>
          <CardContent>
            <PumpChart data={s.chart} />
          </CardContent>
        </Card>
        <SpareSunCard s={s} />
        <WeatherStrip s={s} />
        <Link href={`/farmer/${s.farm.id}/chat`} className={cn(buttonVariants({ size: "lg" }), "w-full bg-[#128C7E] hover:bg-[#0e7266]")}>
          <MessageCircle className="h-5 w-5" aria-hidden /> Assistant se poochein · Ask the assistant
        </Link>
        <Footer s={s} />
      </div>
    </main>
  );
}

function Header({ s, crop }: { s: FarmState; crop: (typeof CROP_NAMES)[keyof typeof CROP_NAMES] }) {
  return (
    <header className="bg-gradient-to-br from-emerald-800 to-teal-700 px-4 pb-5 pt-4 text-white">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-emerald-100 hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden /> PaaniPulse
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{s.farm.farmerName}</h1>
      <p className="text-emerald-50">
        {s.farm.tehsil ? `${s.farm.tehsil}, ` : ""}{s.farm.district}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-emerald-50">
        <span className="inline-flex items-center gap-1"><Wheat className="h-4 w-4" aria-hidden /> {crop.roman} · {crop.en}</span>
        <span className="inline-flex items-center gap-1"><Sprout className="h-4 w-4" aria-hidden /> day {s.today.daysSinceSowing}</span>
        <span>{s.farm.areaAcres} acres</span>
        <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4" aria-hidden /> {s.pump.ratedKw} kW · {s.pump.pvKwp} kWp</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {s.dataSource === "telemetry" ? (
          <Badge variant="info"><Radio className="h-3 w-3" aria-hidden /> Telemetry</Badge>
        ) : (
          <Badge variant="info"><Sun className="h-3 w-3" aria-hidden /> Estimated from sunlight</Badge>
        )}
        {s.weatherSource === "live" && <Badge>Live weather</Badge>}
        {s.weatherSource === "cached-live" && <Badge variant="warning">Saved weather (offline)</Badge>}
        {s.weatherSource === "sample" && <Badge variant="warning"><CircleAlert className="h-3 w-3" aria-hidden /> Sample weather (offline)</Badge>}
        <Badge variant="outline" className="border-white/50 text-white">{s.farm.isSynthetic ? "Simulated demo data" : "Demo farm"}</Badge>
      </div>
    </header>
  );
}

function YesterdayCard({ s }: { s: FarmState }) {
  const y = s.yesterday!;
  const over = y.neededHours <= 0 || y.actualHours > y.neededHours;
  return (
    <Card className={over ? "border-amber-300 bg-amber-50" : ""}>
      <CardContent className="flex gap-3 pt-5">
        <History className="mt-1 h-6 w-6 shrink-0 text-amber-700" aria-hidden />
        <div>
          <p className="text-base font-semibold text-slate-900">
            Kal: pump <span className="text-amber-800">{hrs(y.actualHours)} ghantay</span> chala · zaroorat{" "}
            <span className="text-emerald-800">{hrs(y.neededHours)} ghantay</span>
          </p>
          <p className="text-sm text-slate-700">
            Yesterday: ran {hrs(y.actualHours)} h ({litres(y.pumpedM3)}); crop needed {hrs(y.neededHours)} h.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroCard({ s }: { s: FarmState }) {
  const a = s.today.advice;
  const style =
    a.kind === "irrigate" ? "from-emerald-700 to-emerald-600" : a.kind === "skip-rain" ? "from-indigo-700 to-sky-700" : "from-sky-800 to-sky-600";
  const Icon = a.kind === "irrigate" ? Droplets : a.kind === "skip-rain" ? CloudRain : PowerOff;
  const ur = a.kind === "irrigate" ? `آج پمپ ${hrs(a.hoursToday)} گھنٹے چلائیں` : a.kind === "skip-rain" ? "آج پمپ نہ چلائیں، کل بارش" : "آج پمپ بند رکھیں";
  const roman = a.kind === "irrigate" ? `Aaj pump ${hrs(a.hoursToday)} ghantay chalayen` : a.kind === "skip-rain" ? "Aaj pump na chalayen — kal barish" : "Aaj pump band rakhein";
  const en =
    a.kind === "irrigate" ? `Run the pump ${hrs(a.hoursToday)} hours today` : a.kind === "skip-rain" ? "Skip irrigation — rain expected tomorrow" : "Keep the pump off today";
  const next = a.daysUntilNext;
  return (
    <section aria-labelledby="today-advice" className={cn("rounded-2xl bg-gradient-to-br p-5 text-white shadow-md", style)}>
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
        <Icon className="h-5 w-5" aria-hidden /> Aaj ka mashwara · Today
      </p>
      <p lang="ur" className="urdu mt-2 text-right text-3xl font-bold">{ur}</p>
      <h2 id="today-advice" className="text-2xl font-bold">{roman}</h2>
      <p className="text-white/90">{en}</p>
      {a.kind === "irrigate" && a.totalHours > a.hoursToday && (
        <p className="mt-2 text-sm text-white/90">Total {hrs(a.totalHours)} h for this irrigation — the rest tomorrow.</p>
      )}
      {a.kind !== "irrigate" && next !== null && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
          <CalendarClock className="h-4 w-4" aria-hidden />
          Agla pani ~{next > 14 ? `${Math.round(next / 7)} hafte` : `${next} din`} baad · next irrigation in ~{next > 14 ? `${Math.round(next / 7)} weeks` : `${next} days`}
        </p>
      )}
      <p className="mt-3 text-xs text-white/80">
        Soil moisture used: {Math.round(s.today.depletionStartMm)} of {Math.round(s.today.rawMm)} mm before the crop needs water
      </p>
    </section>
  );
}

function Stat({ icon: Icon, label, value, sub, tone = "text-slate-900" }: { icon: React.ElementType; label: string; value: string; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <Icon className="h-4 w-4" aria-hidden /> {label}
      </p>
      <p className={cn("mt-1 text-lg font-bold leading-tight", tone)}>{value}</p>
      {sub && <div className="mt-0.5 text-xs text-slate-600">{sub}</div>}
    </div>
  );
}

function TodayStats({ s }: { s: FarmState }) {
  const f = s.today.flowRange;
  const rainTomorrow = s.forecast[1]?.precipMm ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-sky-700" aria-hidden /> Aaj · Today</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Stat icon={Leaf} label="Crop uses today" value={litres(s.today.cropUseM3)} sub={s.today.advice.kind === "irrigate" ? "soil is getting dry" : "from soil moisture"} tone="text-emerald-800" />
        <Stat icon={CloudRain} label="Rain tomorrow" value={`${rainTomorrow.toFixed(1)} mm`} sub={rainTomorrow >= 2 ? "barish ka imkaan" : "dry"} tone="text-indigo-800" />
        <Stat
          icon={Droplets}
          label="Pump flow / hour"
          value={`${n0(f.low * 1000)}–${n0(f.high * 1000)} L`}
          sub={
            <Badge variant={s.pump.calibrated ? "default" : "warning"} className="mt-1">
              {s.pump.calibrated ? "Calibrated" : "Default estimate"}
            </Badge>
          }
        />
        <Stat icon={Sun} label="Sun hours for pump" value={`${s.today.pumpableHours} h`} sub={`${n0(s.today.pvKwh)} kWh solar today`} tone="text-amber-700" />
      </CardContent>
    </Card>
  );
}

function WeekCard({ s }: { s: FarmState }) {
  const w = s.week;
  const rs = w.wastedKwh * s.surplusRsPerKwh;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-red-700" aria-hidden /> Is hafte ka nuqsaan · This week&apos;s waste</CardTitle>
        {w.overNeedPct > 5 ? (
          <p className="text-base text-slate-800">
            You pumped <strong className="text-red-700">{Math.round(w.overNeedPct)}% more</strong> water than your crop needed.
          </p>
        ) : (
          <p className="text-base text-slate-800">Your pumping matched the crop&apos;s need. Shabash!</p>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Stat icon={Droplets} label="Water lost below roots" value={litres(w.excessM3)} sub={`${Math.round(w.excessPct)}% of pumped`} tone="text-red-700" />
        <Stat icon={Leaf} label="Urea washed away" value={`${w.ureaKg.toFixed(1)} kg`} sub={`≈ Rs ${n0(w.ureaRs)} · estimate`} tone="text-amber-800" />
        <Stat icon={Zap} label="Solar spent on waste" value={`${n0(w.wastedKwh)} kWh`} sub="energy that lifted extra water" />
        <Stat icon={Coins} label="Could have earned" value={`Rs ${n0(rs)}`} sub={`at Rs ${s.surplusRsPerKwh}/kWh · potential`} tone="text-emerald-800" />
      </CardContent>
    </Card>
  );
}

function SpareSunCard({ s }: { s: FarmState }) {
  const kwh = s.today.todaySpareKwh;
  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5 text-amber-600" aria-hidden /> Fazil dhoop · Spare sunshine</CardTitle>
        <p className="text-sm text-slate-700">
          {s.today.advice.kind === "irrigate" ? "After today's irrigation, about" : "With the pump off today, about"}{" "}
          <strong>{n0(kwh)} kWh</strong> of solar energy is free to use.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {s.today.todaySpareIdeas.map((idea) => (
            <li key={idea.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
              <span className="flex items-center gap-2 text-sm">
                <BatteryCharging className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                <span>
                  {idea.labelEn}
                  <span lang="ur" className="urdu block text-right text-sm text-slate-600">{idea.labelUr}</span>
                </span>
              </span>
              <span className="whitespace-nowrap text-base font-bold text-emerald-800">Rs {n0(idea.rs)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-600">Potential value today; needs a battery, charger or machine on site.</p>
      </CardContent>
    </Card>
  );
}

function WeatherStrip({ s }: { s: FarmState }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Thermometer className="h-5 w-5 text-sky-700" aria-hidden /> Mausam · 7-day weather</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-7 gap-1 text-center text-xs">
          {s.forecast.map((d, i) => (
            <li key={d.date} className={cn("rounded-lg py-2", i === 0 ? "bg-sky-100" : "bg-slate-50")}>
              <p className="font-semibold text-slate-800">{i === 0 ? "Aaj" : i === 1 ? "Kal" : weekday(d.date)}</p>
              {d.precipMm >= 1 ? <CloudRain className="mx-auto my-1 h-5 w-5 text-indigo-700" aria-hidden /> : <Sun className="mx-auto my-1 h-5 w-5 text-amber-500" aria-hidden />}
              <p className="font-bold text-slate-900">{d.tMax !== null ? `${Math.round(d.tMax)}°` : "–"}</p>
              <p className="text-slate-600">{d.tMin !== null ? `${Math.round(d.tMin)}°` : "–"}</p>
              <p className={cn("mt-1", d.precipMm >= 1 ? "font-semibold text-indigo-800" : "text-slate-500")}>{d.precipMm.toFixed(0)} mm</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Footer({ s }: { s: FarmState }) {
  return (
    <footer className="flex flex-col gap-2 pt-2 text-xs text-slate-600">
      <p className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Numbers are computed from FAO-56 crop water use and pump physics (head {s.headM.toFixed(0)} m, {s.kwhPerM3.toFixed(2)} kWh/m³).
          Fertiliser and income figures are estimates.{" "}
          <Link href="/about" className="font-semibold text-sky-800 underline">How we calculate</Link>
        </span>
      </p>
      <p lang="ur" className="urdu text-right text-sm">آپ کا ڈیٹا آپ کا ہے — صرف ضلع کی سطح پر، بغیر نام کے شیئر ہوگا۔</p>
    </footer>
  );
}
