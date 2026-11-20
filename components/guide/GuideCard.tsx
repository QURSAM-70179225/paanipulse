"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { GuidePlayer } from "./GuidePlayer";

const KEY = "pp-guide-hidden";

/** A dismissible card at the top of the farm page: play the voice guide or read it. Hiding it is remembered on this phone. */
export function GuideCard({
  lang, farmId, labels,
}: {
  lang: "ur" | "en";
  farmId: string;
  labels: { title: string; body: string; play: string; stop: string; unavailable: string; read: string; hide: string };
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setHidden(true);
    } catch {
      /* storage blocked: keep showing it */
    }
  }, []);
  if (hidden) return null;
  return (
    <section aria-label={labels.title} className="rounded-2xl bg-gradient-to-br from-sky-700 to-sky-900 p-4 text-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <h2 className="font-bold">{labels.title}</h2>
            <p className="mt-0.5 text-sm text-sky-50">{labels.body}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={labels.hide}
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* ignore */
            }
          }}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <GuidePlayer lang={lang} labels={{ play: labels.play, stop: labels.stop, unavailable: labels.unavailable }} />
        <Link href={`/guide?farm=${encodeURIComponent(farmId)}`} className="text-sm font-semibold underline underline-offset-4">{labels.read}</Link>
      </div>
    </section>
  );
}
