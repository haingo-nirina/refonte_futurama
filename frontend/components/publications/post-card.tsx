import { ProductImage } from "@/components/product-image";
import { formatRelativeDate } from "@/lib/format";
import type { Post } from "@/lib/types";
import { PostCommentForm } from "./post-comment-form";
import { PostLikeButton } from "./post-like-button";

/**
 * Une publication du mur, dans la forme de la maquette : en-tete de page,
 * texte, photo, barre « j'aime / commentaires », fil des commentaires, champ
 * de saisie.
 *
 * Composant serveur : `formatRelativeDate` depend de l'heure courante et
 * rejouerait un texte different du HTML serveur s'il etait hydrate. Seuls le
 * bouton « j'aime » et le champ de commentaire sont des composants client.
 *
 * L'auteur affiche est la boutique elle-meme — le mur est sa page, pas un blog
 * a plusieurs signatures : `Post` ne porte d'ailleurs aucun auteur.
 */
export function PostCard({ post }: { post: Post }) {
  // Une publication en ligne a toujours une date ; `createdAt` ne sert qu'au
  // backoffice, qui affiche aussi les brouillons.
  const date = post.publishedAt ?? post.createdAt;

  return (
    <article className="border-line rounded-[14px] border bg-white p-5.5">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="bg-navy font-display flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-white">
          F
        </span>
        <div className="flex flex-col">
          <span className="text-navy text-[13.5px] font-bold">Futurama.mg</span>
          <time
            dateTime={date}
            className="text-muted-light text-[11.5px] first-letter:uppercase"
          >
            {formatRelativeDate(date)}
          </time>
        </div>
      </header>

      <h2 className="font-display text-navy mb-1.5 text-[16px] font-bold tracking-tight">
        {post.title}
      </h2>
      {/* Le contenu est saisi au kilometre dans le backoffice : les retours a
          la ligne doivent survivre a l'affichage. */}
      <p className="text-ink/85 mb-3.5 text-[14px] leading-[1.55] whitespace-pre-line">
        {post.content}
      </p>

      {post.photoUrl ? (
        <div className="mb-3.5 aspect-[21/9] overflow-hidden rounded-[12px]">
          <ProductImage
            src={post.photoUrl}
            alt={post.title}
            className="h-full w-full"
          />
        </div>
      ) : null}

      <div className="border-line/70 mb-3 flex items-center gap-4.5 border-y py-2.5">
        <PostLikeButton
          // Remonte le bouton des que le serveur renvoie d'autres valeurs :
          // son etat local repart alors de la donnee fraiche.
          key={`${post.liked}-${post.likesCount}`}
          postId={post.id}
          liked={post.liked}
          likesCount={post.likesCount}
        />
        <span className="text-muted text-[13px]">
          💬 {post._count.comments} commentaire
          {post._count.comments > 1 ? "s" : ""}
        </span>
      </div>

      {post.comments.length > 0 ? (
        <ul className="mb-2.5 flex flex-col gap-2">
          {post.comments.map((comment) => (
            <li key={comment.id} className="text-ink/80 text-[12.5px]">
              <strong className="text-ink font-semibold">
                {comment.user.fullName} :
              </strong>{" "}
              {comment.comment}
            </li>
          ))}
        </ul>
      ) : null}

      <PostCommentForm postId={post.id} />
    </article>
  );
}
