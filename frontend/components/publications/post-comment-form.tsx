"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, commentPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Le champ « Ecrire un commentaire… » du mur.
 *
 * Commenter exige un compte, comme deposer un avis : le backend lit l'auteur
 * sur le JWT et refuse tout auteur venu du corps. Le fil est rendu cote
 * serveur, c'est donc au serveur de le relire une fois le commentaire pose.
 */
export function PostCommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginHref = `/connexion?next=${encodeURIComponent(pathname)}`;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const text = comment.trim();
    if (!text) return;

    setPending(true);
    setError(null);

    try {
      await commentPost(postId, text);
      setComment("");
      router.refresh();
    } catch (cause) {
      // Token expire pendant que la page etait ouverte.
      if (cause instanceof ApiError && cause.status === 401) {
        router.push(loginHref);
        return;
      }

      setError(
        cause instanceof ApiError ? cause.message : "Commentaire non envoye",
      );
    } finally {
      setPending(false);
    }
  }

  // Avant hydratation on ne sait pas encore si le visiteur est connecte : le
  // HTML serveur ne connait pas la session.
  if (user === undefined) {
    return (
      <div className="border-line h-[38px] rounded-full border-[1.5px] border-dashed" />
    );
  }

  if (!user) {
    return (
      <p className="text-muted text-[12.5px]">
        <Link href={loginHref} className="text-brand font-bold hover:underline">
          Connectez-vous
        </Link>{" "}
        pour commenter cette publication.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="flex gap-2">
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Ecrire un commentaire…"
          disabled={pending}
          className="border-line-strong focus:border-brand flex-1 rounded-full border-[1.5px] px-3.5 py-2.5 text-[12.5px] outline-none"
        />
        <button
          type="submit"
          disabled={pending || comment.trim() === ""}
          className="bg-brand hover:bg-brand-dark rounded-full px-4 text-[12.5px] font-bold text-white transition disabled:opacity-50"
        >
          {pending ? "Envoi…" : "Envoyer"}
        </button>
      </div>

      {error ? <p className="text-brand mt-2 text-[12.5px]">{error}</p> : null}
    </form>
  );
}
