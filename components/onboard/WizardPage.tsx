import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OnboardWizard } from "./OnboardWizard";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AccountBar } from "@/components/auth/AccountBar";
import type { SessionUser } from "@/lib/auth/token";
import { dictFor, dirFor, type Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

export function WizardPage({ mode, lang, user, backHref }: { mode: "farmer" | "installer"; lang: Lang; user: SessionUser; backHref: string }) {
  const d = dictFor(lang);
  const ur = lang === "ur";
  return (
    <main dir={dirFor(lang)} className={cn("mx-auto min-h-screen max-w-md bg-slate-50", ur && "ur-ui")}>
      <header className="flex flex-col gap-2 bg-gradient-to-br from-emerald-800 to-teal-700 px-4 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <Link href={backHref} className="inline-flex min-h-9 items-center gap-1 text-sm text-emerald-100"><ArrowLeft className={cn("h-4 w-4", ur && "rotate-180")} aria-hidden /> {d.appName}</Link>
          <LanguageToggle lang={lang} />
        </div>
        <h1 className="text-2xl font-bold">{mode === "installer" ? d.addFarm : d.onboardTitle}</h1>
        <AccountBar user={user} signOutLabel={d.signOut} />
      </header>
      <div className="p-4">
        <OnboardWizard mode={mode} lang={lang} dict={d} />
      </div>
    </main>
  );
}
