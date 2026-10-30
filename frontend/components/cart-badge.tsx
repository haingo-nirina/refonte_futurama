"use client";

import Link from "next/link";
import { useCartCount } from "@/lib/use-cart-count";

/** Badge masque tant que le compte n'est pas connu (voir `useCartCount`). */
export function CartBadge() {
  const count = useCartCount();

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
