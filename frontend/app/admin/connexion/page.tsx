import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getMe } from "@/lib/api";
import { getServerToken } from "@/lib/auth-server";

// `absolute` : sans lui le gabarit du layout racine ajoute un second
// « · Futurama » derriere celui du backoffice.
export const metadata: Metadata = {
  title: { absolute: "Connexion · Backoffice Futurama" },
};

/**
 * Entree du backoffice, volontairement hors du groupe `(shell)` : le garde qui
 * y vit redirige ici, il ne doit donc pas couvrir cette page.
 *
 * La boutique a sa propre page de connexion (`/connexion`) et n'a aucun lien
 * vers celle-ci : les deux espaces ne se croisent plus.
 */
export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/connexion">) {
  const token = await getServerToken();

  // Deja connecte en admin : inutile de redemander le mot de passe. On relit le
  // compte plutot que de croire le JWT, comme le garde du `(shell)`.
  if (token) {
    const me = await getMe(token).catch(() => null);

    if (me?.role === "admin") redirect("/admin");
  }

  // Lu ici plutot qu'avec `useSearchParams` : ca evite d'imposer une frontiere
  // Suspense au formulaire.
  const { next } = await searchParams;

  return (
    <main className="bg-navy flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="font-display text-cream text-center text-lg font-extrabold">
          Futurama<span className="text-brand">.</span>
          <span className="text-cream/60 ml-1 text-xs font-semibold tracking-widest">
            ADMIN
          </span>
        </p>

        <div className="admin-card mt-6 p-7">
          <h1 className="font-display text-navy text-xl font-extrabold tracking-tight">
            Connexion
          </h1>
          <p className="text-muted mt-1.5 mb-6 text-sm">
            Espace reserve a la gestion de la boutique.
          </p>

          <AdminLoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </div>
    </main>
  );
}
