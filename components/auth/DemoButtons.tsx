import { Building2, Sprout, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

/** One-tap demo sign-in (plain form POST, works without JavaScript). */
export function DemoButtons({ labels, next, variant = "light" }: { labels: { farmer: string; installer: string; authority: string }; next?: string; variant?: "light" | "dark" }) {
  const items = [
    { as: "farmer", label: labels.farmer, icon: Sprout },
    { as: "installer", label: labels.installer, icon: Wrench },
    { as: "authority", label: labels.authority, icon: Building2 },
  ];
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {items.map((i) => (
        <form key={i.as} action="/api/auth/demo" method="post" className="flex-1">
          <input type="hidden" name="as" value={i.as} />
          {next && <input type="hidden" name="next" value={next} />}
          <button
            type="submit"
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
              variant === "dark" ? "bg-white text-emerald-900 hover:bg-emerald-50 focus-visible:ring-white" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-sky-600",
            )}
          >
            <i.icon className="h-5 w-5" aria-hidden /> {i.label}
          </button>
        </form>
      ))}
    </div>
  );
}
