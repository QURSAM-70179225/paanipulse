"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallLabels {
  title: string;
  body: string;
  install: string;
  later: string;
  iosBody: string;
  installed: string;
}

const DISMISS_KEY = "pp_install_dismissed_at";
const SNOOZE_MS = 7 * 86_400_000;

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Registers the service worker and shows an "Install app" popup (Android/Chrome) or Add-to-Home-Screen tip (iPhone). */
export function InstallPrompt({ labels, dir }: { labels: InstallLabels; dir: "rtl" | "ltr" }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios" | "installed">("hidden");

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (isStandalone()) return; // already running as the installed app
    const snoozed = Number(read(DISMISS_KEY) ?? 0) + SNOOZE_MS > Date.now();

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!snoozed) setMode("prompt");
    };
    const onInstalled = () => {
      setDeferred(null);
      setMode("installed");
      setTimeout(() => setMode("hidden"), 4000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iPhone/iPad Safari has no install event: show instructions once in a while.
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua);
    const t = ios && !snoozed ? setTimeout(() => setMode("ios"), 2500) : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (t) clearTimeout(t);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") {
      setMode("installed");
      setTimeout(() => setMode("hidden"), 4000);
    } else later();
  }
  function later() {
    write(DISMISS_KEY, String(Date.now()));
    setMode("hidden");
  }

  if (mode === "hidden") return null;
  if (mode === "installed") {
    return (
      <div dir={dir} role="status" className="fixed inset-x-0 bottom-4 z-[1000] mx-auto flex w-fit items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-white shadow-lg">
        <CheckCircle2 className="h-5 w-5" aria-hidden /> {labels.installed}
      </div>
    );
  }
  return (
    <div dir={dir} role="dialog" aria-labelledby="pp-install-title" className="fixed inset-x-0 bottom-0 z-[1000] p-3">
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p id="pp-install-title" className="font-bold text-slate-900">{labels.title}</p>
          <p className="mt-0.5 text-sm text-slate-600">{mode === "ios" ? labels.iosBody : labels.body}</p>
          <div className="mt-3 flex gap-2">
            {mode === "prompt" ? (
              <button type="button" onClick={install} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800">
                <Download className="h-4 w-4" aria-hidden /> {labels.install}
              </button>
            ) : (
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm text-slate-700">
                <Share className="h-4 w-4" aria-hidden /> → +
              </span>
            )}
            <button type="button" onClick={later} className={cn("h-11 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50")}>
              {labels.later}
            </button>
          </div>
        </div>
        <button type="button" onClick={later} aria-label={labels.later} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
