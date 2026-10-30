import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { VideoGrid } from "@/components/videos/video-grid";
import { getLiveReplays } from "@/lib/api";

export const metadata = {
  title: "Nos vidéos · Futurama",
  description: "Les lives de la boutique Futurama, à revoir en entier.",
};

/** Trois rangees de la grille. */
const PAGE_SIZE = 9;

export default async function VideosPage({
  searchParams,
}: PageProps<"/videos">) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(String(rawPage ?? "1"), 10) || 1);

  const { data: replays, meta } = await getLiveReplays({
    page,
    limit: PAGE_SIZE,
  });

  return (
    <section className="px-4 pt-10 pb-4 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-brand font-mono text-[10.5px] tracking-[0.18em]">
            EN VIDÉO
          </span>
          <h1 className="font-display text-navy mt-2 text-[32px] font-extrabold tracking-tight">
            Nos vidéos
          </h1>
        </div>
        {meta.totalPages > 1 ? (
          <span className="text-muted text-[13.5px]">
            Page {meta.page} sur {meta.totalPages}
          </span>
        ) : null}
      </div>

      {replays.length === 0 ? (
        <div className="border-line text-muted rounded-[14px] border border-dashed p-10 text-center text-[13.5px]">
          Aucune vidéo pour le moment. Nos lives terminés seront à revoir ici.{" "}
          <Link href="/live" className="text-brand font-bold">
            Voir le prochain live
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* toutes les vidéos d'une page : pas de bande horizontale ici */}
          <VideoGrid replays={replays} />
          <Pagination
            basePath="/videos"
            page={meta.page}
            totalPages={meta.totalPages}
          />
        </div>
      )}
    </section>
  );
}
