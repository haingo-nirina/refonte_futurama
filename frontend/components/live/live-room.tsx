"use client";

import { useCallback, useState } from "react";
import { formatLiveDate } from "@/lib/live";
import { useCartCount } from "@/lib/use-cart-count";
import type { DeliveryZone, Live, Store } from "@/lib/types";
import { FacebookVideo } from "./facebook-video";
import { LiveCartDrawer } from "./live-cart-drawer";
import { LiveProductCard } from "./live-product-card";
import { LiveRefresher } from "./live-refresher";

/**
 * La page live, pensee telephone d'abord : video, annonce, puis produits en
 * carrousel horizontal (la video reste a l'ecran pendant qu'on les parcourt).
 * Sur grand ecran, les produits passent dans une colonne.
 *
 * Le passage de l'annonce au direct, puis au replay, suit ce que la vendeuse
 * active dans le backoffice (`LiveRefresher`) : rien a recharger a la main.
 */
export function LiveRoom({
  live,
  zones,
  stores,
}: {
  live: Live;
  zones: DeliveryZone[];
  stores: Store[];
}) {
  const cartCount = useCartCount();
  const [cartOpen, setCartOpen] = useState(false);

  const isLive = live.status === "EN_DIRECT";
  const isScheduled = live.status === "PROGRAMME";

  const closeCart = useCallback(() => setCartOpen(false), []);

  return (
    <div className="px-4 pt-5 pb-28 sm:px-8 lg:px-12">
      <LiveRefresher shownUrl={isLive ? live.facebookUrl : null} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* ------------------------------------------------ Video / annonce */}
        <div className="lg:col-start-1">
          {!isScheduled && live.facebookUrl ? (
            <FacebookVideo url={live.facebookUrl} title={live.title} />
          ) : (
            <div className="bg-navy flex aspect-video flex-col items-center justify-center gap-2 rounded-[14px] px-6 text-center text-white">
              <span className="text-[12px] font-bold tracking-[0.2em] text-white/60 uppercase">
                Prochain live
              </span>
              <span className="font-display text-[22px] font-extrabold first-letter:uppercase sm:text-[28px]">
                {formatLiveDate(live.scheduledAt)}
              </span>
              <span className="text-[13px] text-white/70">
                La vidéo s&apos;affichera ici dès le début du direct.
              </span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------- Annonce */}
        <div className="lg:col-start-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={live.status} />
            {isScheduled ? null : (
              <span className="text-muted text-[12.5px] first-letter:uppercase">
                {formatLiveDate(live.startedAt ?? live.scheduledAt)}
              </span>
            )}
          </div>
          <h1 className="font-display text-navy mt-2 text-[24px] leading-tight font-extrabold tracking-tight sm:text-[30px]">
            {live.title}
          </h1>
          {live.description ? (
            <p className="text-muted mt-2 text-[14px] whitespace-pre-line">
              {live.description}
            </p>
          ) : null}
        </div>

        {/* ------------------------------------------------------ Produits */}
        <section className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <h2 className="font-display text-navy mb-3 text-[17px] font-extrabold">
            {isScheduled ? "Produits présentés" : "Les produits du live"}
            <span className="text-muted text-[13px] font-medium">
              {" "}
              · {live.products.length}
            </span>
          </h2>

          {live.products.length === 0 ? (
            <p className="text-muted border-line rounded-[12px] border bg-white px-4 py-6 text-center text-[13px]">
              Les produits seront annoncés très bientôt.
            </p>
          ) : (
            <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
              {live.products.map((product) => (
                <li
                  key={product.id}
                  className="w-[46%] max-w-[220px] shrink-0 snap-start sm:w-[30%] lg:w-auto lg:max-w-none"
                >
                  <LiveProductCard product={product} />
                </li>
              ))}
            </ul>
          )}

          {isScheduled ? (
            <p className="text-muted mt-2 text-[12px]">
              Déjà disponibles : vous pouvez les commander dès maintenant.
            </p>
          ) : null}
        </section>

      </div>

      {/* Le bouton de l'assistant occupe le coin droit : le panier prend le
          gauche. */}
      {cartCount ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="bg-navy font-display fixed bottom-6 left-4 z-[600] flex items-center gap-2.5 rounded-full px-5 py-3.5 text-[13.5px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(20,20,40,0.55)] sm:left-6"
        >
          Commander
          <span className="bg-brand flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px]">
            {cartCount}
          </span>
        </button>
      ) : null}

      <LiveCartDrawer
        open={cartOpen}
        onClose={closeCart}
        liveId={live.id}
        zones={zones}
        stores={stores}
      />
    </div>
  );
}

function StatusPill({ status }: { status: Live["status"] }) {
  if (status === "EN_DIRECT") {
    return (
      <span className="bg-brand inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold text-white">
        <span className="size-2 animate-pulse rounded-full bg-white" />
        En direct
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${
        status === "PROGRAMME"
          ? "bg-tint-cool text-tint-cool-ink"
          : "bg-line text-muted"
      }`}
    >
      {status === "PROGRAMME" ? "À venir" : "Replay"}
    </span>
  );
}
