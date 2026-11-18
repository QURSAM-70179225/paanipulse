"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import type { DictKey } from "@/lib/i18n/dict";

type D = Record<DictKey, string>;
const input = "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";
const label = "flex flex-col gap-1 text-sm font-medium text-slate-700";
const btn = "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  return { ok: !!res?.ok, error: (data as { error?: string }).error };
}

export function ForgotForm({ d }: { d: D }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (sent) return <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-900">{d.linkSent}</p>;
  return (
    <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await post("/api/auth/forgot", { email }); setBusy(false); setSent(true); }}>
      <label className={label}>{d.email}<input className={input} dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <button className={btn} disabled={busy}><Mail className="h-4 w-4" aria-hidden /> {d.sendLink}</button>
    </form>
  );
}

export function ResetForm({ d, token }: { d: D; token: string }) {
  const [pw, setPw] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid">("idle");
  if (state === "done") return <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-900">{d.resetDone} <Link href="/login" className="font-semibold underline">{d.signIn}</Link></p>;
  return (
    <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); setState("busy"); const r = await post("/api/auth/reset", { token, password: pw }); setState(r.ok ? "done" : "invalid"); }}>
      <label className={label}>{d.newPassword}<input className={input} dir="ltr" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
      {state === "invalid" && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{d.resetInvalid} <Link href="/forgot" className="underline">{d.forgot}</Link></p>}
      <button className={btn} disabled={state === "busy"}><KeyRound className="h-4 w-4" aria-hidden /> {d.savePassword}</button>
    </form>
  );
}

export function ChangeSecretForm({ d, isFarmer }: { d: D; isFarmer: boolean }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await post("/api/account/password", { current: cur, next });
        setMsg(r.ok ? { ok: true, text: d.saved } : { ok: false, text: r.error === "wrong-current" ? d.errCurrent : r.error === "weak" ? d.errWeak : r.error === "demo-account" ? d.errDemo : d.errGeneric });
        if (r.ok) { setCur(""); setNext(""); }
      }}
    >
      <label className={label}>{d.currentSecret}<input className={input} dir="ltr" type="password" required value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></label>
      <label className={label}>
        {isFarmer ? d.newPin : d.newPassword}
        <input className={input} dir="ltr" type="password" required value={next} onChange={(e) => setNext(isFarmer ? e.target.value.replace(/\D/g, "") : e.target.value)}
          inputMode={isFarmer ? "numeric" : undefined} maxLength={isFarmer ? 6 : 200} minLength={isFarmer ? 4 : 8} autoComplete="new-password" />
      </label>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "rounded-xl bg-emerald-50 p-3 text-emerald-900" : "rounded-xl bg-red-50 p-3 text-sm text-red-800"}>{msg.text}</p>}
      <button className={btn}><KeyRound className="h-4 w-4" aria-hidden /> {isFarmer ? d.changePin : d.changePassword}</button>
    </form>
  );
}

export function ResetPinButton({ farmerId, name, d }: { farmerId: string; name: string; d: D }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-2 text-sm hover:bg-slate-50"
        onClick={async () => {
          const pin = window.prompt(d.resetPinPrompt.replace("{name}", name))?.trim();
          if (!pin) return;
          if (!/^\d{4,6}$/.test(pin)) return setMsg(d.errWeak);
          const r = await post("/api/installer/reset-pin", { farmerId, pin });
          setMsg(r.ok ? d.pinReset : d.errGeneric);
        }}
      >
        <KeyRound className="h-4 w-4" aria-hidden /> {d.resetPin}
      </button>
      {msg && <span role="status" className="mt-0.5 text-xs text-slate-600">{msg}</span>}
    </span>
  );
}
