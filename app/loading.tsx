import { Loader2 } from "lucide-react";

/**
 * Shown while a page's data loads. It also makes Next.js stream each page inside a Suspense boundary, so React waits
 * until a page's HTML has fully arrived before hydrating it. Without it, on a slow or chunked connection (Render behind
 * Cloudflare) React could start hydrating a half-parsed page and throw a hydration mismatch (React error #418).
 */
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6" aria-busy="true">
      <p role="status" className="flex items-center gap-3 text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" aria-hidden />
        <span lang="ur" dir="rtl">لوڈ ہو رہا ہے…</span>
        <span lang="en" className="text-sm">Loading…</span>
      </p>
    </main>
  );
}
