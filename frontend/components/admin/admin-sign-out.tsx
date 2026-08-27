"use client";

import { useRouter } from "next/navigation";
import { endSession } from "@/lib/auth";
import { notifyCartUpdated } from "@/lib/session";

export function AdminSignOut() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        endSession();
        // Le badge du header boutique doit repartir sur un panier sans token.
        notifyCartUpdated();
        router.push("/");
        router.refresh();
      }}
      className="text-xs text-cream/70 transition hover:text-brand"
    >
      Deconnexion
    </button>
  );
}
