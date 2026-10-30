import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveRoom } from "@/components/live/live-room";
import {
  ApiError,
  getDeliveryZones,
  getLiveReplay,
  getStores,
} from "@/lib/api";
import type { DeliveryZone, Store } from "@/lib/types";

export const metadata: Metadata = { title: "Replay du live" };

/**
 * Le replay reprend la salle du live : la video Facebook et les produits
 * presentes, toujours achetables sans quitter la page.
 */
export default async function ReplayPage({
  params,
}: PageProps<"/videos/[id]">) {
  const { id } = await params;

  const [replay, zones, stores] = await Promise.all([
    getLiveReplay(id).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getDeliveryZones().catch((): DeliveryZone[] => []),
    getStores().catch((): Store[] => []),
  ]);

  return (
    <div>
      <div className="px-4 pt-5 sm:px-8 lg:px-12">
        <Link
          href="/videos"
          className="text-muted hover:text-brand text-[13px] font-medium"
        >
          ← Toutes les vidéos
        </Link>
      </div>
      <LiveRoom live={replay} zones={zones} stores={stores} />
    </div>
  );
}
