import type { LiveReplay } from "@/lib/types";
import { VideoCard } from "./video-card";

/**
 * Trois colonnes sur grand ecran ; sur telephone, une bande qui defile a
 * l'horizontale, comme la maquette mobile.
 */
export function VideoGrid({ replays }: { replays: LiveReplay[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
      {replays.map((replay) => (
        <li key={replay.id} className="w-[72%] shrink-0 snap-start sm:w-auto">
          <VideoCard replay={replay} />
        </li>
      ))}
    </ul>
  );
}
