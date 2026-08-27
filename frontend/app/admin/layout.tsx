import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSignOut } from "@/components/admin/admin-sign-out";
import { getMe } from "@/lib/api";
import { getServerToken } from "@/lib/auth-server";

export const metadata = {
  title: { default: "Backoffice", template: "%s · Backoffice Futurama" },
};

/**
 * Porte d'entree du backoffice.
 *
 * Le controle se fait ici, cote serveur, et **relit le compte en base** via
 * `GET /auth/me` : le role est fige dans le JWT a l'emission, donc un compte
 * retrograde garderait un token « admin » valide jusqu'a expiration. Le
 * localStorage du navigateur, lui, ne prouve rien du tout.
 *
 * Ce garde n'est qu'un confort d'affichage : chaque route admin du backend
 * revalide de son cote. Un contournement de cette page ne donne acces a rien.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const token = await getServerToken();

  if (!token) redirect("/connexion?next=/admin");

  const me = await getMe(token).catch(() => null);

  if (!me) redirect("/connexion?next=/admin");
  // 404 plutot que 403 : inutile d'annoncer l'existence d'un backoffice.
  if (me.role !== "admin") notFound();

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      <aside className="flex flex-col gap-6 bg-navy px-4 py-6 text-cream lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="font-display text-lg font-extrabold">
            Futurama<span className="text-brand">.</span>
            <span className="ml-1 text-xs font-semibold tracking-widest text-cream/60">
              ADMIN
            </span>
          </Link>
        </div>

        <AdminNav />

        <div className="mt-auto space-y-3 border-t border-cream/15 pt-4 text-sm">
          <p className="truncate font-semibold">{me.fullName}</p>
          <p className="truncate text-xs text-cream/60">{me.email}</p>
          <Link
            href="/"
            className="block text-xs text-cream/70 transition hover:text-cream"
          >
            ← Retour a la boutique
          </Link>
          <AdminSignOut />
        </div>
      </aside>

      <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
