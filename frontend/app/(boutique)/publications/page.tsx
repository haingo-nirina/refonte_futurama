import { Pagination } from "@/components/pagination";
import { PostCard } from "@/components/publications/post-card";
import { getPosts } from "@/lib/api";
import { getServerToken } from "@/lib/auth-server";

export const metadata = {
  title: "Nos publications · Futurama",
  description: "Les nouvelles de la boutique Futurama, a Tsaralalana.",
};

/** Publications par page, comme la maquette. */
const PAGE_SIZE = 5;

export default async function PublicationsPage({
  searchParams,
}: PageProps<"/publications">) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(String(rawPage ?? "1"), 10) || 1);

  // Le token part explicitement : cote serveur le cookie n'est pas lisible
  // depuis `lib/api.ts`. Sans lui, le mur ignorerait ce que le visiteur a
  // deja aime.
  const token = await getServerToken();
  const { data: posts, meta } = await getPosts(
    { page, limit: PAGE_SIZE },
    token,
  );

  return (
    <section className="px-4 pt-10 pb-4 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-brand font-mono text-[10.5px] tracking-[0.18em]">
            SUR NOTRE PAGE
          </span>
          <h1 className="font-display text-navy mt-2 text-[32px] font-extrabold tracking-tight">
            Nos publications
          </h1>
        </div>
        {meta.totalPages > 1 ? (
          <span className="text-muted text-[13.5px]">
            Page {meta.page} sur {meta.totalPages}
          </span>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <p className="border-line text-muted mx-auto max-w-[880px] rounded-[14px] border border-dashed p-10 text-center text-[13.5px]">
          Aucune publication pour le moment. Revenez bientot.
        </p>
      ) : (
        <div className="mx-auto flex max-w-[880px] flex-col gap-4.5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          <Pagination
            basePath="/publications"
            page={meta.page}
            totalPages={meta.totalPages}
          />
        </div>
      )}
    </section>
  );
}
