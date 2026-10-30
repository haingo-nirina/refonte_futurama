"use client";

import { useEffect, useState } from "react";
import { CheckoutForm } from "@/app/(boutique)/panier/checkout-form";
import { ProductImage } from "@/components/product-image";
import { getCart } from "@/lib/api";
import { formatMgPhone } from "@/lib/checkout";
import { formatPrice, toAmount } from "@/lib/format";
import { CART_UPDATED_EVENT, getSessionId } from "@/lib/session";
import type { Cart, DeliveryZone, Order, Store } from "@/lib/types";

/**
 * Le panier et la commande de la boutique, ouverts par-dessus la page live :
 * meme `CheckoutForm` (MVola, livraison ou retrait), mais la confirmation
 * s'affiche ici au lieu de mener a `/commande/:id` — la video continue.
 *
 * Panneau en position fixe plutot qu'un `<dialog>` : le formulaire ouvre
 * deja sa propre popup de confirmation (`<dialog>`), et deux modales natives
 * se disputeraient le piegeage du focus.
 */
export function LiveCartDrawer({
  open,
  onClose,
  liveId,
  zones,
  stores,
}: {
  open: boolean;
  onClose: () => void;
  liveId: string;
  zones: DeliveryZone[];
  stores: Store[];
}) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      try {
        const loaded = await getCart(getSessionId());
        if (!cancelled) {
          setCart(loaded);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Panier indisponible");
      }
    }

    void load();
    window.addEventListener(CART_UPDATED_EVENT, load);

    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, load);
    };
  }, [open]);

  // Echap ferme le panneau — sauf si la popup de confirmation est ouverte :
  // elle gere sa propre fermeture.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        onClose();
      }
    }

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function close() {
    // Une confirmation deja lue ne doit pas reapparaitre a la prochaine ouverture.
    setOrder(null);
    onClose();
  }

  const items = cart?.items ?? [];
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce(
    (total, item) => total + toAmount(item.unitPrice) * item.quantity,
    0,
  );

  return (
    <div className="fixed inset-0 z-[700]">
      <button
        type="button"
        aria-label="Fermer le panier"
        onClick={close}
        className="bg-navy/40 absolute inset-0 h-full w-full cursor-default"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-cart-title"
        className="bg-cream absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[18px] shadow-xl lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[440px] lg:rounded-none"
      >
        <header className="border-line flex items-center justify-between border-b px-5 py-4">
          <h2
            id="live-cart-title"
            className="font-display text-navy text-[18px] font-extrabold"
          >
            {order ? "Commande enregistrée" : "Votre panier"}
            {!order && itemCount > 0 ? (
              <span className="text-muted text-[14px] font-medium">
                {" "}
                · {itemCount} article{itemCount > 1 ? "s" : ""}
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="text-muted hover:text-brand flex size-9 items-center justify-center rounded-[8px] text-2xl leading-none"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4">
          {order ? (
            <OrderDone order={order} onClose={close} />
          ) : error ? (
            <p className="text-brand text-sm">{error}</p>
          ) : !cart ? (
            <p className="text-muted text-sm">Chargement du panier…</p>
          ) : items.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">
              Votre panier est vide. Ajoutez un produit présenté pendant le
              live.
            </p>
          ) : (
            <div className="grid gap-5">
              <ul className="border-line divide-line divide-y rounded-[12px] border bg-white">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-3">
                    <ProductImage
                      src={item.product.images[0]?.imageUrl}
                      alt={item.product.name}
                      className="size-14 shrink-0 rounded-[8px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">
                        {item.product.name}
                      </p>
                      <p className="text-muted text-[12px]">
                        {formatPrice(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-display text-navy text-[14px] font-extrabold">
                      {formatPrice(toAmount(item.unitPrice) * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <CheckoutForm
                items={items}
                subtotal={subtotal}
                itemCount={itemCount}
                zones={zones}
                stores={stores}
                liveId={liveId}
                onOrdered={setOrder}
                returnTo="/live"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDone({ order, onClose }: { order: Order; onClose: () => void }) {
  const isDelivery = order.fulfillmentMethod === "LIVRAISON";

  return (
    <div className="grid gap-4 py-2">
      <span className="bg-success-soft text-success self-start rounded-md px-3 py-1.5 text-[12.5px] font-semibold">
        Merci {order.contactName} !
      </span>
      <p className="text-[14px]">
        Votre commande <strong>{order.number}</strong> de{" "}
        <strong>{formatPrice(order.total)}</strong> est enregistrée. Paiement
        par MVola
        {order.mvolaPhone ? ` depuis le ${formatMgPhone(order.mvolaPhone)}` : ""}.
      </p>
      <p className="text-muted text-[13px]">
        {isDelivery
          ? `Nous vous rappelons au ${formatMgPhone(order.contactPhone)} pour confirmer la livraison.`
          : "Vous recevrez un SMS avec votre code de retrait dès que la commande sera prête."}
      </p>

      <button
        type="button"
        onClick={onClose}
        className="bg-brand hover:bg-brand-dark font-display rounded-[10px] py-3.5 text-[15px] font-bold text-white transition"
      >
        Continuer à regarder le live
      </button>
      {/* Nouvel onglet : la page de confirmation complete, sans couper la video. */}
      <a
        href={`/commande/${order.id}`}
        target="_blank"
        rel="noopener"
        className="text-navy hover:text-brand text-center text-[13px] font-bold"
      >
        Voir le détail de ma commande ↗
      </a>
    </div>
  );
}
