import { LogOut, UserRound } from "lucide-react";
import type { SessionUser } from "@/lib/auth/token";
import { cn } from "@/lib/utils";

/** Signed-in user's name + sign-out (form POST, no JS needed). */
export function AccountBar({ user, signOutLabel, className }: { user: SessionUser; signOutLabel: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="inline-flex min-w-0 items-center gap-1 truncate"><UserRound className="h-4 w-4 shrink-0" aria-hidden /> <span className="truncate">{user.name}</span></span>
      <form action="/api/auth/logout" method="post">
        <button type="submit" className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white/15 px-3 font-semibold hover:bg-white/25">
          <LogOut className="h-4 w-4" aria-hidden /> {signOutLabel}
        </button>
      </form>
    </div>
  );
}
