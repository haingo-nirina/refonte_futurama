"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentLive } from "@/lib/use-current-live";

/**
 * Relit la page /live quand le direct en cours ne correspond plus a celui
 * qu'elle affiche : debut, fin ou lien change. `shownUrl` est le lien du live
 * que la page montre en direct, `null` sinon.
 *
 * Interroge `GET /live/current` (leger, garde en cache par le backend) plutot
 * que la page entiere : chaque visiteur relit toutes les 30 s.
 * `router.refresh()` ne demonte pas l'`<iframe>` : la video ne coupe pas.
 */
export function LiveRefresher({ shownUrl }: { shownUrl: string | null }) {
  const router = useRouter();
  const live = useCurrentLive();

  useEffect(() => {
    if (live === undefined) return;
    if ((live?.url ?? null) !== shownUrl) router.refresh();
  }, [live, shownUrl, router]);

  return null;
}
