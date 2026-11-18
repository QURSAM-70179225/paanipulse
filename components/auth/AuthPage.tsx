import Link from "next/link";
import { ArrowLeft, Sun } from "lucide-react";
import { AuthForm } from "./AuthForm";
import { DemoButtons } from "./DemoButtons";
import { LanguageToggle } from "@/components/LanguageToggle";
import { dictFor, dirFor, type Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

export function AuthPage({ mode, lang, next, demoEnabled }: { mode: "login" | "signup"; lang: Lang; next?: string; demoEnabled: boolean }) {
  const dict = dictFor(lang);
  const ur = lang === "ur";
  return (
    <main dir={dirFor(lang)} className={cn("min-h-screen bg-slate-50", ur && "ur-ui")}>
      <header className="bg-gradient-to-br from-emerald-800 to-teal-700 px-4 pb-8 pt-4 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href="/" className="inline-flex min-h-9 items-center gap-1 text-sm text-emerald-100 hover:text-white">
            <ArrowLeft className={cn("h-4 w-4", ur && "rotate-180")} aria-hidden /> <Sun className="h-4 w-4" aria-hidden /> {dict.appName}
          </Link>
          <LanguageToggle lang={lang} />
        </div>
        <h1 className="mx-auto mt-4 max-w-md text-3xl font-bold">{mode === "login" ? dict.signIn : dict.createAccount}</h1>
      </header>
      <div className="mx-auto -mt-4 flex max-w-md flex-col gap-4 px-4 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <AuthForm mode={mode} dict={dict} next={next} />
        </div>
        {demoEnabled && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">{dict.tryDemo}</p>
            <DemoButtons labels={{ farmer: dict.demoFarmer, installer: dict.demoInstaller, authority: dict.demoAuthority }} next={next} />
          </div>
        )}
      </div>
    </main>
  );
}
