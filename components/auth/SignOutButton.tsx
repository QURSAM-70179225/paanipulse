"use client";

import { clearOffline } from "@/lib/offline";

/** Sign-out form that also wipes the advice, queued reports and timer stored on this phone. */
export function SignOutButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <form action="/api/auth/logout" method="post" onSubmit={() => clearOffline()}>
      <button type="submit" className={className}>{children}</button>
    </form>
  );
}
