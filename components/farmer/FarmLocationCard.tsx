"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { More } from "@/components/ui/more";

export interface FarmLocationLabels {
  title: string; body: string; why: string; button: string; finding: string; saved: string; more: string;
  errDenied: string; errOutside: string; errInaccurate: string; errFar: string; errGeneric: string;
}

/**
 * Shown while the farm's spot is only the district centre. When the farmer is standing in his field, one tap saves the phone's
 * GPS position as the farm's location, so weather and rain are for his own field. Reminded weekly by SMS until it is done.
 */
export function FarmLocationCard({ farmId, district, listen, labels }: { farmId: string; district: string; listen?: React.ReactNode; labels: FarmLocationLabels }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    if (!navigator.geolocation) { setMsg({ ok: false, text: labels.errGeneric }); return; }
    setBusy(true);
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const r = await fetch(`/api/farms/${farmId}/location`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) {
            const map: Record<string, string> = { outside: labels.errOutside, inaccurate: labels.errInaccurate, far: labels.errFar };
            setMsg({ ok: false, text: map[d.error] ?? labels.errGeneric });
            return;
          }
          setMsg({ ok: true, text: labels.saved });
          router.refresh();
        } catch {
          setMsg({ ok: false, text: labels.errGeneric });
        } finally {
          setBusy(false);
        }
      },
      (e) => {
        setBusy(false);
        setMsg({ ok: false, text: e.code === e.PERMISSION_DENIED ? labels.errDenied : labels.errInaccurate });
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-amber-700" aria-hidden /> {labels.title}</CardTitle>
          <div className="shrink-0">{listen}</div>
        </div>
        <p className="text-sm text-slate-800">{labels.body.replace("{district}", district)}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <button type="button" disabled={busy} onClick={save} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-lg font-bold text-white disabled:opacity-60">
          <Crosshair className="h-5 w-5" aria-hidden /> {busy ? labels.finding : labels.button}
        </button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "rounded-xl bg-emerald-100 p-2 text-sm text-emerald-900" : "rounded-xl bg-red-50 p-2 text-sm text-red-800"}>{msg.text}</p>}
        <More label={labels.more}><p>{labels.why}</p></More>
      </CardContent>
    </Card>
  );
}
