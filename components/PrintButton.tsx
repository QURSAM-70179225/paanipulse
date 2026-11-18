"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="no-print inline-flex h-11 items-center gap-2 rounded-xl bg-sky-700 px-4 font-semibold text-white hover:bg-sky-800">
      <Printer className="h-4 w-4" aria-hidden /> {label}
    </button>
  );
}
