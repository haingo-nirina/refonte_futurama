import Link from "next/link";
import type { Post } from "@/lib/types";
import { PostCard } from "./post-card";

/**
 * La section « Nos publications » de l'accueil : les dernieres nouvelles de la
 * page, le mur complet vivant sur `/publications`.
 *
 * Purement presentationnelle, comme `LatestProducts` : le classement vient du
 * backend, qui trie sur `publishedAt` decroissant et masque brouillons et
 * publications programmees. Elle ne rend rien tant que rien n'est publie.
 */
export function LatestPublications({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="px-4 pt-14 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-brand font-mono text-[10.5px] tracking-[0.18em]">
            SUR NOTRE PAGE
          </span>
          <h2 className="font-display text-navy mt-2 text-[32px] font-extrabold tracking-tight">
            Nos publications
          </h2>
        </div>
        <Link href="/publications" className="text-brand text-[13.5px] font-bold">
          Tout voir →
        </Link>
      </div>

      <div className="mx-auto flex max-w-[880px] flex-col gap-4.5">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
