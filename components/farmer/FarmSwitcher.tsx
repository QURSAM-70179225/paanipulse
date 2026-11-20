"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, Plus } from "lucide-react";

export interface FarmOption {
  id: string;
  label: string;
}

/** Switch between the farms in one account, add a new one, or see them all. Switching opens that farm's own page. */
export function FarmSwitcher({ farms, currentId, labels }: { farms: FarmOption[]; currentId: string; labels: { farm: string; add: string; all: string } }) {
  const router = useRouter();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <label className="sr-only" htmlFor="farm-switch">{labels.farm}</label>
      <select
        id="farm-switch"
        value={currentId}
        onChange={(e) => router.push(`/farmer/${e.target.value}`)}
        className="num h-10 max-w-[60%] flex-1 rounded-full border border-white/40 bg-white/15 px-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {farms.map((f) => <option key={f.id} value={f.id} className="text-slate-900">{f.label}</option>)}
      </select>
      <Link href="/farmer/onboard" className="inline-flex h-10 items-center gap-1 rounded-full bg-white px-3 font-semibold text-emerald-900"><Plus className="h-4 w-4" aria-hidden /> {labels.add}</Link>
      {farms.length > 1 && <Link href="/farmer/farms" className="inline-flex h-10 items-center gap-1 rounded-full border border-white/40 px-3 text-white"><LayoutGrid className="h-4 w-4" aria-hidden /> {labels.all}</Link>}
    </div>
  );
}
