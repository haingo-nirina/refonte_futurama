import Link from "next/link";
import { formatLiveDay } from "@/lib/live";
import type { LiveReplay } from "@/lib/types";

/**
 * Carte de la section « Nos vidéos », d'apres la maquette : aplat sombre,
 * bouton lecture, titre et sous-titre en bas. Pas de vignette : Facebook ne
 * la fournit pas sans acces a son API.
 */
export function VideoCard({ replay }: { replay: LiveReplay }) {
  const day = replay.startedAt ?? replay.endedAt;

  return (
    <Link
      href={`/videos/${replay.id}`}
      className="group relative block aspect-[16/10] overflow-hidden rounded-[14px] bg-[#0b0f1a]"
    >
      <span className="absolute top-3 left-3 rounded-full bg-white/12 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-white/80">
        REPLAY DU LIVE
      </span>
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-[rgba(10,14,26,0)] to-[rgba(10,14,26,0.78)] p-4">
        <span className="text-brand mb-2.5 flex size-[38px] items-center justify-center rounded-full bg-white text-[13px] transition group-hover:scale-110">
          ▶
        </span>
        <span className="font-display line-clamp-2 text-[14.5px] font-bold text-white">
          {replay.title}
        </span>
        <span className="mt-0.5 text-[12px] text-white/75">
          {day ? `Live du ${formatLiveDay(day)} · ` : null}
          {replay._count.products > 1
            ? `${replay._count.products} produits`
            : `${replay._count.products} produit`}
        </span>
      </div>
    </Link>
  );
}
