import Link from "next/link";
import type { LiveReplay } from "@/lib/types";
import { VideoGrid } from "./video-grid";

/**
 * La section « Nos vidéos » de l'accueil : les derniers replays de live, la
 * liste complete vivant sur `/videos`. Ne rend rien tant qu'aucun live n'est
 * termine.
 */
export function LatestVideos({ replays }: { replays: LiveReplay[] }) {
  if (replays.length === 0) return null;

  return (
    <section className="px-4 pt-14 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-brand font-mono text-[10.5px] tracking-[0.18em]">
            EN VIDÉO
          </span>
          <h2 className="font-display text-navy mt-2 text-[32px] font-extrabold tracking-tight">
            Nos vidéos
          </h2>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="text-muted hidden text-[13.5px] sm:inline">
            Nos lives à revoir en entier
          </span>
          <Link href="/videos" className="text-brand text-[13.5px] font-bold">
            Tout voir →
          </Link>
        </div>
      </div>

      <VideoGrid replays={replays} />
    </section>
  );
}
