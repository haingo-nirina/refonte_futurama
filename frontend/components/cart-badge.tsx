"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart } from "@/lib/api";
import { CART_UPDATED_EVENT, getSessionId } from "@/lib/session";

/**
 * Le nombre d'articles depend du localStorage : il ne peut etre lu qu'apres
 * l'hydratation. On repart de `null` (badge masque) pour eviter tout ecart
 * entre le HTML serveur et le premier rendu client.
 */
export function CartBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const cart = await getCart(getSessionId());
        if (cancelled) return;
        setCount(cart.items.reduce((total, item) => total + item.quantity, 0));
      } catch {
        if (!cancelled) setCount(null);
      }
    }

    void refresh();
    window.addEventListener(CART_UPDATED_EVENT, refresh);

    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, refresh);
    };
  }, []);

  return (
    <Link
      href="/panier"
      className="border-line bg-cream hover:border-brand flex items-center gap-2.5 rounded-[10px] border px-4 py-2.5"
    >
      <span className="text-navy text-[13.5px] font-bold">Panier</span>
      {count !== null && count > 0 ? (
        <span className="bg-brand flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
