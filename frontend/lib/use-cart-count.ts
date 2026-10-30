"use client";

import { useEffect, useState } from "react";
import { getCart } from "./api";
import { CART_UPDATED_EVENT, getSessionId } from "./session";

/**
 * Nombre d'articles du panier, relu a chaque `notifyCartUpdated()`.
 *
 * Il depend du localStorage (`session_id`) : il ne peut etre lu qu'apres
 * l'hydratation. `null` jusque-la (et si l'API echoue), pour eviter tout ecart
 * entre le HTML serveur et le premier rendu client.
 */
export function useCartCount(): number | null {
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

  return count;
}
