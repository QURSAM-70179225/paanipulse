import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { dirFor, type Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

export function SimplePage({ lang, title, back, backLabel, children }: { lang: Lang; title: string; back: string; backLabel: string; children: React.ReactNode }) {
  const ur = lang === "ur";
  return (
    <main dir={dirFor(lang)} className={cn("min-h-screen bg-slate-50", ur && "ur-ui")}>
      <header className="bg-gradient-to-br from-emerald-800 to-teal-700 px-4 pb-8 pt-4 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href={back} className="inline-flex min-h-9 items-center gap-1 text-sm text-emerald-100"><ArrowLeft className={cn("h-4 w-4", ur && "rotate-180")} aria-hidden /> {backLabel}</Link>
          <LanguageToggle lang={lang} />
        </div>
        <h1 className="mx-auto mt-4 max-w-md text-2xl font-bold">{title}</h1>
      </header>
      <div className="mx-auto -mt-4 flex max-w-md flex-col gap-4 px-4 pb-10">{children}</div>
    </main>
  );
}
