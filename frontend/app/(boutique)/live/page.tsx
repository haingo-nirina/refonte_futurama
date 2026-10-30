import type { Metadata } from "next";
import Link from "next/link";
import { LiveRefresher } from "@/components/live/live-refresher";
import { LiveRoom } from "@/components/live/live-room";
import { getCurrentLive, getDeliveryZones, getStores } from "@/lib/api";
import { ALL_CATEGORIES_SLUG } from "@/lib/catalogue";
import type { DeliveryZone, Store } from "@/lib/types";

export const metadata: Metadata = { title: "Live shopping" };

/**
 * Le live et ce qu'il faut pour commander sans quitter la page (zones et
 * boutiques, comme le panier) sont lus au rendu serveur. Le reste — panier,
 * surveillance du direct — vit dans le navigateur.
 */
export default async function LivePage() {
  const [live, zones, stores] = await Promise.all([
    getCurrentLive().catch(() => null),
    getDeliveryZones().catch((): DeliveryZone[] => []),
    getStores().catch((): Store[] => []),
  ]);

  if (!live) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        {/* Le premier direct detecte cree son live : la page doit le voir. */}
        <LiveRefresher shownUrl={null} />
        <h1 className="font-display text-navy text-[26px] font-extrabold">
          Pas de live pour le moment
        </h1>
        <p className="text-muted mt-3 text-[14px]">
          Nos lives sont annoncés ici et sur notre page Facebook. En attendant,
          tout le catalogue reste disponible.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/catalogue/${ALL_CATEGORIES_SLUG}`}
            className="bg-brand hover:bg-brand-dark font-display rounded-[10px] px-6 py-3 text-sm font-bold text-white"
          >
            Parcourir le catalogue
          </Link>
          <Link
            href="/publications"
            className="border-line-strong text-navy font-display rounded-[10px] border bg-white px-6 py-3 text-sm font-bold"
          >
            Nos publications
          </Link>
        </div>
      </div>
    );
  }

  // Le passage de l'annonce au direct, puis au replay, suit ce que la
  // vendeuse active dans le backoffice : rien a recharger a la main.
  return (
    <>
      <LiveRefresher
        shownUrl={live.status === "EN_DIRECT" ? live.facebookUrl : null}
      />
      <LiveRoom live={live} zones={zones} stores={stores} />
    </>
  );
}
