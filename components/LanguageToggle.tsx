"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

export function LanguageToggle({ lang, className }: { lang: Lang; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (l: Lang) => {
    if (l === lang) return;
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  return (
    <div
      role="group"
      aria-label="Language / زبان"
      dir="ltr"
      className={cn("inline-flex items-center gap-1 rounded-full bg-white/15 p-1 text-sm", pending && "opacity-70", className)}
    >
      <Languages className="mx-1 h-4 w-4" aria-hidden />
      {(["ur", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={lang === l}
          className={cn(
            "min-h-9 rounded-full px-3 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
            lang === l ? "bg-white text-emerald-900" : "text-white hover:bg-white/10",
            l === "ur" && "urdu leading-none",
          )}
        >
          {l === "ur" ? "اردو" : "English"}
        </button>
      ))}
    </div>
  );
}
