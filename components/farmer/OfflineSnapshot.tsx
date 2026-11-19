"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { flushQueue, queuedReports, saveSnapshot, type Snapshot } from "@/lib/offline";

/**
 * Saves the latest advice on the phone (for /offline.html), sends queued reports when the connection is back,
 * and shows a banner when the connection drops while the app is open.
 */
export function OfflineSnapshot({ snapshot, labels }: { snapshot: Snapshot; labels: { offline: string; pending: string } }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    saveSnapshot(snapshot);
    const update = () => {
      setOnline(navigator.onLine);
      setPending(queuedReports().length);
    };
    const sync = async () => {
      update();
      if (navigator.onLine && queuedReports().length) {
        await flushQueue();
        update();
      }
    };
    void sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", update);
    const id = setInterval(sync, 60_000);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", update);
      clearInterval(id);
    };
  }, [snapshot]);

  if (online && pending === 0) return null;
  const t = new Date(snapshot.savedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" });
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-100 px-3 py-2 text-center text-sm font-medium text-amber-950">
      <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
      {!online ? labels.offline.replace("{t}", t) : labels.pending.replace("{n}", String(pending))}
      {!online && pending > 0 && <span> · {labels.pending.replace("{n}", String(pending))}</span>}
    </div>
  );
}
