"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Sprout, Wrench } from "lucide-react";
import type { DictKey } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";
type Who = "FARMER" | "INSTALLER" | "AUTHORITY";

const ERRORS: Record<string, DictKey> = {
  "wrong-credentials": "errWrong",
  "too-many-attempts": "errTooMany",
  "invalid-phone": "errPhone",
  "phone-taken": "errTaken",
  "email-taken": "errTaken",
  "invalid-invite": "errInvite",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">{label}{children}</label>;
}

export function AuthForm({ mode, dict, next, initialRole }: { mode: Mode; dict: Record<DictKey, string>; next?: string; initialRole?: Who }) {
  const T = (k: DictKey) => dict[k];
  const [who, setWho] = useState<Who>(initialRole ?? "FARMER");
  const [f, setF] = useState({ name: "", phone: "", pin: "", email: "", password: "", organisation: "", inviteCode: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body =
      mode === "login"
        ? who === "FARMER"
          ? { kind: "phone", phone: f.phone, pin: f.pin }
          : { kind: "email", email: f.email, password: f.password }
        : who === "FARMER"
          ? { role: who, name: f.name, phone: f.phone, pin: f.pin }
          : { role: who, name: f.name, organisation: f.organisation, email: f.email, password: f.password, ...(who === "AUTHORITY" ? { inviteCode: f.inviteCode } : {}) };
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(T(ERRORS[data.error as string] ?? "errGeneric"));
        return;
      }
      const dest = mode === "login" && next && next.startsWith("/") && !next.startsWith("//") ? next : data.home;
      window.location.assign(dest);
    } catch {
      setError(T("errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  const input = "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600";
  const tabs: { id: Who; label: string; hint: string; icon: React.ElementType }[] = [
    { id: "FARMER", label: T("iAmFarmer"), hint: T("roleFarmerHint"), icon: Sprout },
    { id: "INSTALLER", label: T("iAmInstaller"), hint: T("roleInstallerHint"), icon: Wrench },
    { id: "AUTHORITY", label: T("iAmAuthority"), hint: T("roleAuthorityHint"), icon: Building2 },
  ];

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate={false}>
      <p className="text-sm font-semibold text-slate-700">{T("whoAreYou")}</p>
      <div role="tablist" aria-label={T("whoAreYou")} className="grid grid-cols-3 gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={who === t.id}
            onClick={() => setWho(t.id)}
            className={cn(
              "flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 px-1.5 py-2 text-center transition-colors",
              who === t.id ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
            )}
          >
            <t.icon className="h-6 w-6" aria-hidden />
            <span className="text-sm font-bold leading-tight">{t.label}</span>
            <span className="text-[11px] font-medium leading-tight opacity-80">{t.hint}</span>
          </button>
        ))}
      </div>

      {mode === "signup" && <Field label={T("yourName")}><input className={input} value={f.name} onChange={set("name")} required minLength={2} autoComplete="name" /></Field>}
      {who === "FARMER" ? (
        <>
          <Field label={T("phone")}>
            <input className={cn(input, "num")} dir="ltr" type="tel" inputMode="tel" placeholder={T("phoneHint")} value={f.phone} onChange={set("phone")} required autoComplete="tel" />
          </Field>
          <Field label={T("pin")}>
            <input className={cn(input, "num tracking-[0.5em]")} dir="ltr" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6} value={f.pin} onChange={set("pin")} required autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </Field>
        </>
      ) : (
        <>
          {mode === "signup" && <Field label={T("organisation")}><input className={input} value={f.organisation} onChange={set("organisation")} required minLength={2} autoComplete="organization" /></Field>}
          <Field label={T("email")}><input className={input} dir="ltr" type="email" value={f.email} onChange={set("email")} required autoComplete="email" /></Field>
          <Field label={T("password")}>
            <input className={input} dir="ltr" type="password" minLength={mode === "signup" ? 8 : 6} value={f.password} onChange={set("password")} required autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </Field>
          {mode === "signup" && who === "AUTHORITY" && <Field label={T("inviteCode")}><input className={input} dir="ltr" value={f.inviteCode} onChange={set("inviteCode")} required /></Field>}
        </>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {mode === "login" && (
        <Link href="/forgot" className="-mt-1 text-sm font-semibold text-sky-800 underline">{T("forgot")}</Link>
      )}
      <button type="submit" disabled={busy} className="h-12 rounded-xl bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
        {mode === "login" ? T("signIn") : T("createAccount")}
      </button>
      <p className="text-center text-sm text-slate-600">
        {mode === "login" ? T("noAccount") : T("haveAccount")}{" "}
        <Link className="font-semibold text-sky-800 underline" href={mode === "login" ? "/signup" : "/login"}>
          {mode === "login" ? T("createAccount") : T("signIn")}
        </Link>
      </p>
    </form>
  );
}
