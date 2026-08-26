"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/product-image";
import { getCart } from "@/lib/api";
import { ALL_CATEGORIES_SLUG } from "@/lib/catalogue";
import { formatPrice, toAmount } from "@/lib/format";
import { CART_UPDATED_EVENT, getSessionId } from "@/lib/session";
import type { Cart } from "@/lib/types";
import { CheckoutForm } from "./checkout-form";

export function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const loaded = await getCart(getSessionId());
        if (!cancelled) setCart(loaded);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Panier indisponible",
          );
        }
      }
    }

    void load();
    window.addEventListener(CART_UPDATED_EVENT, load);

    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, load);
    };
  }, []);

  if (error) {
    return (
      <Shell>
        <p className="text-brand text-sm">{error}</p>
      </Shell>
    );
  }

  if (!cart) {
    return (
      <Shell>
        <p className="text-muted text-sm">Chargement du panier…</p>
      </Shell>
    );
  }

  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.items.reduce(
    (total, item) => total + toAmount(item.unitPrice) * item.quantity,
    0,
  );

  if (cart.items.length === 0) {
    return (
      <Shell>
        <div className="border-line rounded-[14px] border bg-white px-6 py-16 text-center">
          <p className="text-muted text-sm">Votre panier est vide.</p>
          <Link
            href={`/catalogue/${ALL_CATEGORIES_SLUG}`}
            className="bg-brand hover:bg-brand-dark font-display mt-6 inline-block rounded-[10px] px-6 py-3 text-sm font-bold text-white"
          >
            Parcourir le catalogue
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell count={itemCount}>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="border-line overflow-hidden rounded-[14px] border bg-white">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="border-line flex items-center gap-4 border-b p-4 last:border-b-0"
              >
                <Link
                  href={`/produit/${item.productId}`}
                  className="h-[84px] w-[84px] flex-none overflow-hidden rounded-[10px]"
                >
                  <ProductImage
                    src={item.product.images[0]?.imageUrl}
                    alt={item.product.name}
                    className="h-full w-full"
                  />
                </Link>

                <div className="flex flex-1 flex-col gap-1">
                  <Link
                    href={`/produit/${item.productId}`}
                    className="text-ink hover:text-brand text-[15px] font-medium"
                  >
                    {item.product.name}
                  </Link>
                  <span className="text-muted text-[12.5px]">
                    {formatPrice(item.unitPrice)} × {item.quantity}
                  </span>
                </div>

                <span className="font-display text-navy w-28 flex-none text-right text-base font-extrabold">
                  {formatPrice(toAmount(item.unitPrice) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <Link
            href={`/catalogue/${ALL_CATEGORIES_SLUG}`}
            className="text-brand mt-5 inline-block text-[13.5px] font-bold"
          >
            ← Continuer mes achats
          </Link>
        </div>

        <aside className="border-line bg-cream-deep rounded-[14px] border p-6">
          <h2 className="font-display text-navy mb-5 text-lg font-bold">
            Recapitulatif
          </h2>

          <div className="text-muted flex justify-between py-2 text-[13.5px]">
            <span>Sous-total</span>
            <span className="text-ink font-medium">
              {formatPrice(subtotal)}
            </span>
          </div>
          <div className="text-muted flex justify-between py-2 text-[13.5px]">
            <span>Livraison Antananarivo</span>
            <span className="text-success font-medium">Offerte</span>
          </div>

          <div className="border-line mt-2 flex justify-between border-t py-4">
            <span className="font-display text-navy text-base font-bold">
              Total
            </span>
            <span className="font-display text-navy text-[22px] font-extrabold tracking-tight">
              {formatPrice(subtotal)}
            </span>
          </div>

          <CheckoutForm />
        </aside>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-12">
      <h1 className="font-display text-navy mb-6 text-[30px] font-extrabold tracking-tight">
        Votre panier
        {count !== undefined ? (
          <span className="text-muted text-lg font-medium">
            {" "}
            · {count} article{count > 1 ? "s" : ""}
          </span>
        ) : null}
      </h1>
      {children}
    </div>
  );
}
