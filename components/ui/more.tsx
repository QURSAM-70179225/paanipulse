import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hides explanations ("theory") behind a small "More info" button, so a card shows only what the farmer needs to act.
 * Plain <details>: works without JavaScript and offline, and screen readers announce it as expandable.
 */
export function More({ label, children, tone = "light", className }: { label: string; children: React.ReactNode; tone?: "light" | "dark"; className?: string }) {
  return (
    <details className={cn("group text-sm", className)}>
      <summary
        className={cn(
          "inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-full px-2 font-semibold [&::-webkit-details-marker]:hidden",
          tone === "dark" ? "text-white/90 hover:bg-white/15" : "text-sky-800 hover:bg-sky-50",
        )}
      >
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        {label}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className={cn("mt-2 flex flex-col gap-2 leading-6", tone === "dark" ? "text-white/90" : "text-slate-600")}>{children}</div>
    </details>
  );
}
