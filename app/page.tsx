import Link from "next/link";
import { Gauge, MessageCircle, Coins, Map, Sun, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { DemoButtons } from "@/components/auth/DemoButtons";
import { getSession } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/token";
import { dirFor, t, type DictKey } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const STATS: { value: string; key: DictKey }[] = [
  { value: "~650,000", key: "stat1" },
  { value: "77%", key: "stat2" },
  { value: "0", key: "stat3" },
];

const STEPS: { icon: React.ElementType; title: DictKey; text: DictKey }[] = [
  { icon: Gauge, title: "stepMeasure", text: "stepMeasureText" },
  { icon: MessageCircle, title: "stepAdvise", text: "stepAdviseText" },
  { icon: Coins, title: "stepEarn", text: "stepEarnText" },
  { icon: Map, title: "stepMap", text: "stepMapText" },
];

export default async function Home() {
  const lang = await getLang("en");
  const T = (k: DictKey) => t(lang, k);
  const ur = lang === "ur";
  const user = await getSession();
  const demoEnabled = (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false";
  return (
    <main dir={dirFor(lang)} className={cn(ur && "ur-ui")}>
      <section className="bg-gradient-to-br from-emerald-800 via-teal-700 to-sky-800 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6 sm:py-20">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-100">
              <Sun className="h-4 w-4" aria-hidden /> {T("appName")}
            </p>
            <LanguageToggle lang={lang} />
          </div>
          <h1 className={cn("font-bold leading-tight", ur ? "text-2xl sm:text-4xl" : "text-4xl sm:text-5xl")}>
            {T("heroTitle1")}
            <br />
            {T("heroTitle2")}
          </h1>
          <p className="max-w-2xl text-lg text-emerald-50">{T("heroBody")}</p>
          {user ? (
            <Link href={homeFor(user.role)} className={cn(buttonVariants({ size: "lg" }), "w-fit bg-white text-emerald-900 hover:bg-emerald-50")}>
              {user.name} <ArrowRight className={cn("h-4 w-4", ur && "rotate-180")} aria-hidden />
            </Link>
          ) : (
            <div className="flex flex-col gap-3">
              {demoEnabled && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-emerald-100">{T("tryDemo")}</p>
                  <DemoButtons variant="dark" labels={{ farmer: T("demoFarmer"), installer: T("demoInstaller"), authority: T("demoAuthority") }} />
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "border-white/60 bg-transparent text-white hover:bg-white/10")}>
                  <LogIn className="h-5 w-5" aria-hidden /> {T("signIn")}
                </Link>
                <Link href="/signup" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "border-white/60 bg-transparent text-white hover:bg-white/10")}>
                  <UserPlus className="h-5 w-5" aria-hidden /> {T("createAccount")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6" aria-labelledby="problem">
        <h2 id="problem" className="mb-6 text-2xl font-bold">{T("problem")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STATS.map((s) => (
            <Card key={s.key}>
              <CardContent className="pt-5">
                <p className="num text-3xl font-bold text-emerald-800">{s.value}</p>
                <p className="mt-2 text-sm text-slate-700">{T(s.key)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="mb-6 text-2xl font-bold">{T("howItWorks")}</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <CardHeader>
                  <s.icon className="h-7 w-7 text-sky-700" aria-hidden />
                  <CardTitle>
                    <span className="num">{i + 1}.</span> {T(s.title)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{T(s.text)}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <footer className="flex flex-col items-center gap-2 border-t border-slate-200 py-6 text-center text-xs text-slate-600">
        <Link href="/about" className="font-semibold text-sky-800 underline">{T("howWeCalculate")}</Link>
        <span>{T("footerTheme")}</span>
      </footer>
    </main>
  );
}
