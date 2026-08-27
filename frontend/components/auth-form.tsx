"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, register } from "@/lib/api";
import { safeNextPath, startSession } from "@/lib/auth";
import { notifyCartUpdated } from "@/lib/session";

type Mode = "login" | "register";

const COPY = {
  login: {
    title: "Connexion",
    intro: "Retrouvez vos commandes et validez votre panier.",
    submit: "Se connecter",
    pending: "Connexion…",
    switchText: "Pas encore de compte ?",
    switchLabel: "Créer un compte",
    switchHref: "/inscription",
  },
  register: {
    title: "Créer un compte",
    intro: "Un compte est nécessaire pour passer commande.",
    submit: "Créer mon compte",
    pending: "Création…",
    switchText: "Vous avez déjà un compte ?",
    switchLabel: "Se connecter",
    switchHref: "/connexion",
  },
} as const;

/** Un champ vide doit disparaitre du body : le backend refuse `""`. */
function optional(value: FormDataEntryValue | null): string | undefined {
  const trimmed = String(value ?? "").trim();

  return trimmed === "" ? undefined : trimmed;
}

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const copy = COPY[mode];
  const destination = safeNextPath(next);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const session =
        mode === "login"
          ? await login({ email, password })
          : await register({
              email,
              password,
              fullName: String(form.get("fullName") ?? "").trim(),
              phone: optional(form.get("phone")),
              address: optional(form.get("address")),
            });

      startSession(session);

      // Le backend rattache le panier anonyme au compte a la premiere requete
      // authentifiee sur ce `session_id` : refaire lire le panier suffit.
      notifyCartUpdated();

      router.replace(destination);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "La connexion a échoué",
      );
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-8">
      <div className="border-line rounded-[18px] border bg-white p-8">
        <h1 className="font-display text-navy text-[26px] font-extrabold tracking-tight">
          {copy.title}
        </h1>
        <p className="text-muted mt-2 text-sm">{copy.intro}</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          {mode === "register" ? (
            <Field
              name="fullName"
              label="Nom complet"
              autoComplete="name"
              placeholder="Rakoto Andrianina"
            />
          ) : null}

          <Field
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.mg"
          />
          <Field
            name="password"
            label="Mot de passe"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={mode === "register" ? 8 : undefined}
            placeholder={mode === "register" ? "8 caractères minimum" : ""}
          />

          {mode === "register" ? (
            <>
              <Field
                name="phone"
                label="Téléphone (facultatif)"
                type="tel"
                autoComplete="tel"
                placeholder="+261 32 00 000 00"
                required={false}
              />
              <Field
                name="address"
                label="Adresse (facultatif)"
                autoComplete="street-address"
                placeholder="Lot II M 15 Tsaralalana, Antananarivo"
                required={false}
              />
            </>
          ) : null}

          {error ? (
            <p className="text-brand text-[13px] font-medium">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="bg-brand hover:bg-brand-dark font-display mt-2 rounded-[10px] py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
          >
            {pending ? copy.pending : copy.submit}
          </button>
        </form>

        <p className="text-muted mt-5 text-center text-[13px]">
          {copy.switchText}{" "}
          <Link
            href={
              next
                ? `${copy.switchHref}?next=${encodeURIComponent(destination)}`
                : copy.switchHref
            }
            className="text-brand font-bold"
          >
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  required = true,
  ...input
}: {
  name: string;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-muted text-xs font-medium">{label}</span>
      <input
        name={name}
        required={required}
        className="border-line-strong text-ink focus:border-brand rounded-[9px] border-[1.5px] bg-white px-3.5 py-2.5 text-sm outline-none"
        {...input}
      />
    </label>
  );
}
