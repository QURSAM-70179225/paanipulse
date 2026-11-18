import Link from "next/link";
import { Droplets, Gauge, MessageCircle, Coins, Map, Sun, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATS = [
  { value: "~650,000", label: "solar tube wells in Pakistan (expert estimate), ~250,000 added since 2023" },
  { value: "77%", label: "of solar farms pumped more water than comparable diesel farms (peer-reviewed study, 2025)" },
  { value: "0", label: "meters on farm tube wells — extraction is unregistered and unmeasured" },
];

const STEPS = [
  { icon: Gauge, title: "Measure", text: "A virtual water meter from pump specs, sunlight and run-hours. No hardware." },
  { icon: MessageCircle, title: "Advise", text: "A daily Urdu voice note: when to run the pump, and when to keep it off." },
  { icon: Coins, title: "Earn", text: "Hours not pumped become spare solar kWh, saved fertiliser and rupees." },
  { icon: Map, title: "Map", text: "Anonymised, district-level extraction data for regulators and lenders." },
];

export default function Home() {
  return (
    <main>
      <section className="bg-gradient-to-br from-emerald-800 via-teal-700 to-sky-800 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-100">
            <Sun className="h-4 w-4" aria-hidden /> PaaniPulse
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Solar made pumping free.
            <br />
            PaaniPulse makes it smart.
          </h1>
          <p className="max-w-2xl text-lg text-emerald-50">
            A virtual water and energy meter for solar tube wells. It tells farmers exactly when to run the pump, and
            when to keep it off, so they save fertiliser and turn spare sunshine into income.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/farmer/karamat" className={cn(buttonVariants({ size: "lg" }), "bg-white text-emerald-900 hover:bg-emerald-50")}>
              <Droplets className="h-5 w-5" aria-hidden /> Farmer demo <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/authority" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "border-white/60 bg-transparent text-white hover:bg-white/10")}>
              <Map className="h-5 w-5" aria-hidden /> Authority dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6" aria-labelledby="problem">
        <h2 id="problem" className="mb-6 text-2xl font-bold">The problem</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STATS.map((s) => (
            <Card key={s.value}>
              <CardContent className="pt-5">
                <p className="text-3xl font-bold text-emerald-800">{s.value}</p>
                <p className="mt-2 text-sm text-slate-700">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="mb-6 text-2xl font-bold">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <CardHeader>
                  <s.icon className="h-7 w-7 text-sky-700" aria-hidden />
                  <CardTitle>
                    {i + 1}. {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{s.text}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-600">
        LUMS CfE × OGDCL CleanTech Hackathon 2026 · Renewable &amp; Alternative Energy
      </footer>
    </main>
  );
}
