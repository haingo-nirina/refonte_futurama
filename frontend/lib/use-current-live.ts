"use client";

import { useEffect, useState } from "react";
import { getCurrentFacebookLive } from "./api";
import type { FacebookLive } from "./types";

/** Un direct ne commence pas a la seconde pres : 30 s suffisent, et menagent le backend. */
const POLL_INTERVAL_MS = 30_000;

/**
 * Live en direct, relu au montage puis toutes les 30 s.
 *
 * Renvoie `undefined` tant que la premiere reponse n'est pas arrivee (comme
 * `useAuth()`, ne rien deviner avant l'hydratation), puis le live ou `null`.
 * Une API injoignable vaut « pas de live » : la page ne doit pas casser.
 *
 * Tant que le meme live continue, l'objet renvoye reste le meme : un lecteur
 * qui depend de lui n'est pas recharge a chaque relecture.
 */
export function useCurrentLive(): FacebookLive | null | undefined {
  const [live, setLive] = useState<FacebookLive | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      let next: FacebookLive | null;
      try {
        next = await getCurrentFacebookLive();
      } catch {
        next = null;
      }
      if (cancelled) return;
      setLive((previous) =>
        previous && next && previous.id === next.id && previous.url === next.url
          ? previous
          : next,
      );
    }

    void refresh();
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return live;
}
