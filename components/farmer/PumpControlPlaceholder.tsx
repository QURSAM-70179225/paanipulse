import { PowerOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shown while remote pump control is not connected: either the server has it switched off, or the installer has not enabled it
 * for this pump. It is visible but "dull" (muted, dashed, buttons disabled) so people can see the feature exists and what it needs.
 */
export function PumpControlPlaceholder({ labels, reason }: { labels: { title: string; start: string; stop: string; notAvail: string; notOn: string; needs: string; off: string }; reason: "unavailable" | "not-enabled" }) {
  return (
    <Card className="border-dashed bg-slate-50 opacity-80" aria-label={labels.title}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PowerOff className="h-5 w-5 text-slate-400" aria-hidden /> {labels.title}</CardTitle>
        <p className="text-2xl font-bold text-slate-500">{labels.off}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">{reason === "unavailable" ? labels.notAvail : labels.notOn}</p>
        <p className="text-sm text-slate-600">{labels.needs}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled className="min-h-12 rounded-xl bg-slate-200 font-semibold text-slate-500">{labels.start}</button>
          <button type="button" disabled className="min-h-12 rounded-xl bg-slate-200 font-semibold text-slate-500">{labels.stop}</button>
        </div>
      </CardContent>
    </Card>
  );
}
