"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, deletePostComment, updatePostComment } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PostComment } from "@/lib/types";

/**
 * Un commentaire du fil, modifiable et supprimable — par son auteur seul. Le
 * backend le verifie de son cote (403) : ce qui suit ne fait que masquer des
 * boutons inutiles aux autres visiteurs.
 *
 * `date` arrive deja formatee du serveur : la calculer ici donnerait un texte
 * different de celui du rendu serveur, et l'hydratation s'en plaindrait. Les
 * reponses suivent le meme chemin, d'ou `replies` deja date par date.
 *
 * `asShopReply` signe la ligne « Futurama.mg » plutot que du nom du compte :
 * seule une route admin cree une reponse, et le mur est la page de la
 * boutique — c'est elle qui repond, pas la personne derriere le backoffice.
 */
export function PostCommentItem({
  comment,
  date,
  replies = [],
  asShopReply = false,
}: {
  comment: PostComment;
  date: string;
  replies?: { comment: PostComment; date: string }[];
  asShopReply?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(comment.comment);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthor = user?.id === comment.user.id;

  function fail(cause: unknown, fallback: string) {
    // Token expire pendant que la page etait ouverte.
    if (cause instanceof ApiError && cause.status === 401) {
      router.push(`/connexion?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setError(cause instanceof ApiError ? cause.message : fallback);
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();

    const text = draft.trim();
    if (!text) return;

    setPending(true);
    setError(null);

    try {
      await updatePostComment(comment.postId, comment.id, text);
      setEditing(false);
      // Le fil est rendu cote serveur : c'est a lui de le relire.
      router.refresh();
    } catch (cause) {
      fail(cause, "Modification impossible");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    setPending(true);
    setError(null);

    try {
      await deletePostComment(comment.postId, comment.id);
      router.refresh();
    } catch (cause) {
      fail(cause, "Suppression impossible");
      setPending(false);
      setConfirming(false);
    }
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={onSave} className="flex flex-col gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={pending}
            className="border-line-strong focus:border-brand rounded-full border-[1.5px] px-3.5 py-2.5 text-[12.5px] outline-none"
          />

          <div className="flex flex-wrap items-center gap-3 text-[12.5px] font-bold">
            <button
              type="submit"
              disabled={pending || draft.trim() === ""}
              className="bg-brand hover:bg-brand-dark rounded-full px-4 py-1.5 text-white transition disabled:opacity-50"
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setDraft(comment.comment);
                setError(null);
              }}
              className="text-muted hover:text-brand"
            >
              Annuler
            </button>
          </div>

          {error ? <p className="text-brand text-[12.5px]">{error}</p> : null}
        </form>
      </li>
    );
  }

  return (
    <li className="text-ink/80 text-[12.5px]">
      <strong className="text-ink font-semibold">
        {asShopReply ? "Futurama.mg" : comment.user.fullName}
        {asShopReply ? (
          <span className="bg-tint-cool text-tint-cool-ink ml-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold">
            Boutique
          </span>
        ) : null}{" "}
        :
      </strong>{" "}
      {comment.comment}
      <span className="text-muted-light ml-1.5 text-[11.5px]">{date}</span>
      {isAuthor ? (
        <span className="ml-2 inline-flex flex-wrap items-center gap-2.5 text-[11.5px] font-bold">
          {confirming ? (
            <>
              <span className="text-muted font-normal">Supprimer ?</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => void onDelete()}
                className="text-brand hover:underline disabled:opacity-50"
              >
                {pending ? "Suppression…" : "Oui"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(false)}
                className="text-muted hover:text-ink"
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-navy hover:text-brand"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-brand hover:underline"
              >
                Supprimer
              </button>
            </>
          )}
        </span>
      ) : null}
      {error ? <p className="text-brand mt-1">{error}</p> : null}

      {replies.length > 0 ? (
        <ul className="border-line mt-2 ml-3 flex flex-col gap-2 border-l pl-3">
          {replies.map((reply) => (
            <PostCommentItem
              key={reply.comment.id}
              comment={reply.comment}
              date={reply.date}
              asShopReply
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
