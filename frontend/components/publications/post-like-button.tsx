"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, likePost, unlikePost } from "@/lib/api";

/**
 * Le « j'aime » de la maquette.
 *
 * L'etat bascule tout de suite puis se recale sur la reponse du serveur : un
 * aller-retour vers Aiven prend quelques secondes, attendre rendrait le bouton
 * inerte. Les deux routes sont idempotentes cote backend, un double clic ne
 * peut donc pas decompter deux fois.
 *
 * `PostCard` remonte ce composant des que le serveur renvoie d'autres valeurs
 * (via sa `key`) : l'etat local repart alors de la donnee fraiche.
 */
export function PostLikeButton({
  postId,
  liked,
  likesCount,
}: {
  postId: string;
  liked: boolean;
  likesCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState({ liked, likesCount });
  const [pending, setPending] = useState(false);

  async function onToggle() {
    const next = !state.liked;

    setPending(true);
    setState({
      liked: next,
      // Le compteur ne descend jamais sous zero, meme si l'etat local avait
      // pris de l'avance sur le serveur.
      likesCount: Math.max(0, state.likesCount + (next ? 1 : -1)),
    });

    try {
      const post = next ? await likePost(postId) : await unlikePost(postId);
      setState({ liked: post.liked, likesCount: post.likesCount });
    } catch (cause) {
      // Aimer exige un compte : plutot qu'une erreur brute, on renvoie se
      // connecter et on revient ici ensuite.
      if (cause instanceof ApiError && cause.status === 401) {
        router.push(`/connexion?next=${encodeURIComponent(pathname)}`);
      }

      setState({ liked, likesCount });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onToggle()}
      disabled={pending}
      aria-pressed={state.liked}
      className={`flex items-center gap-1.5 text-[13px] transition disabled:opacity-60 ${
        state.liked ? "text-brand font-bold" : "text-muted hover:text-ink"
      }`}
    >
      👍 J&apos;aime · {state.likesCount}
    </button>
  );
}
