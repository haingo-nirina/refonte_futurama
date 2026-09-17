"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/api";
import { safeNextPath, startSession } from "@/lib/auth";
import { notifyCartUpdated } from "@/lib/session";

/**
 * Connexion du backoffice, distincte de celle de la boutique.
 *
 * Deux differences avec `components/auth-form.tsx`, qui justifient de ne pas
 * le reutiliser : il n'y a pas de mode inscription (un compte admin ne se cree
 * pas depuis un formulaire public), et la destination reste **dans** le
 * backoffice — cette page ne doit pas servir de tremplin vers une route
 * arbitraire.
 */
export function AdminLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  // `safeNextPath` ecarte deja l'externe ; on exige en plus `/admin`.
  const candidate = safeNextPath(next, "/admin");
  const destination = candidate.startsWith("/admin") ? candidate : "/admin";

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const session = await login({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });

      // Identifiants valides mais compte client : ouvrir la session ici
      // enverrait droit sur le 404 du garde. Mieux vaut le dire.
      if (session.user.role !== "admin") {
        setError("Ce compte n'a pas acces au backoffice.");
        setPending(false);

        return;
      }

      startSession(session);
      // Le badge du header boutique doit repartir sur le panier du compte.
      notifyCartUpdated();

      router.replace(destination);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "La connexion a echoue",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="admin-label">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="admin@futurama.test"
          className="admin-input"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="admin-label">Mot de passe</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="admin-input"
        />
      </label>

      {error ? (
        <p className="text-brand text-[13px] font-medium">{error}</p>
      ) : null}

      <button type="submit" disabled={pending} className="admin-button mt-1">
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
