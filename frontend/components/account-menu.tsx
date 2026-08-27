"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { endSession, useAuth } from "@/lib/auth";
import { notifyCartUpdated } from "@/lib/session";

/**
 * Rendu apres hydratation uniquement (`user === undefined`) : le serveur ne
 * connait pas la session du visiteur, afficher un etat devine ferait diverger
 * le HTML. On reserve la place pour eviter que le header ne saute.
 */
export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  if (user === undefined) {
    return <div className="h-[42px] w-[104px]" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href={`/connexion?next=${encodeURIComponent(pathname)}`}
        className="border-line bg-cream hover:border-brand flex h-[42px] items-center rounded-[10px] border px-4"
      >
        <span className="text-navy text-[13.5px] font-bold">Se connecter</span>
      </Link>
    );
  }

  function onLogout() {
    endSession();
    // Le badge doit repartir sur un panier lu sans token.
    notifyCartUpdated();
    router.push("/");
    router.refresh();
  }

  // Premier mot seulement : le header est deja dense sur petit ecran.
  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="flex h-[42px] flex-col justify-center leading-tight">
      <span className="text-navy text-[13.5px] font-bold">{firstName}</span>
      <button
        type="button"
        onClick={onLogout}
        className="text-muted hover:text-brand text-left text-[11.5px]"
      >
        Déconnexion
      </button>
    </div>
  );
}
