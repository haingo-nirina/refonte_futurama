"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/admin/modal";
import { replyToPostComment } from "@/lib/admin-api";
import { ApiError, deletePostComment } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Post, PostComment } from "@/lib/types";

/**
 * Moderation du fil d'une publication, et reponses de la boutique.
 *
 * Les commentaires sont deja joints a `GET /posts` — le mur les affiche sans
 * second appel, le backoffice n'en fait donc pas non plus : les racines dans
 * `comments`, les reponses dans leur `replies`.
 *
 * Deux actions ici : repondre et retirer. Reecrire le texte d'un client sous
 * sa signature ne serait pas de la moderation, et le backend le refuse (403
 * sur `PATCH`, auteur seul) — une reponse de la boutique reste en revanche
 * modifiable par son auteur depuis le mur.
 *
 * Les confirmations sont en ligne plutot qu'en `ConfirmDialog` : deux
 * `<dialog>` ouverts en meme temps se disputent le piegeage du focus.
 */
export function PostCommentsModal({
  post,
  onClose,
}: {
  post: Post | null;
  onClose: () => void;
}) {
  const router = useRouter();

  const [confirming, setConfirming] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setConfirming(null);
    setReplyingTo(null);
    setDraft("");
    setError(null);
  }

  async function onDelete(commentId: string) {
    if (!post) return;

    setPending(true);
    setError(null);

    try {
      await deletePostComment(post.id, commentId);
      setConfirming(null);
      // La page est un Server Component : c'est au serveur de relire le fil.
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Suppression impossible",
      );
    } finally {
      setPending(false);
    }
  }

  async function onReply(event: React.FormEvent) {
    event.preventDefault();
    if (!post || !replyingTo) return;

    const text = draft.trim();
    if (!text) return;

    setPending(true);
    setError(null);

    try {
      await replyToPostComment(post.id, replyingTo, text);
      setReplyingTo(null);
      setDraft("");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Reponse non envoyee",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={post !== null}
      onClose={() => {
        if (pending) return;
        reset();
        onClose();
      }}
      title="Commentaires"
      description={post ? `Sous « ${post.title} »` : undefined}
    >
      {post && post.comments.length === 0 ? (
        <p className="text-muted text-[13.5px]">
          Aucun commentaire sur cette publication.
        </p>
      ) : (
        <ul className="divide-line divide-y">
          {post?.comments.map((comment) => (
            <li key={comment.id}>
              <CommentLine
                comment={comment}
                confirming={confirming}
                pending={pending}
                onAskReply={() => {
                  setError(null);
                  setConfirming(null);
                  setDraft("");
                  setReplyingTo(comment.id);
                }}
                onAskDelete={() => {
                  setError(null);
                  setReplyingTo(null);
                  setConfirming(comment.id);
                }}
                onCancelDelete={() => setConfirming(null)}
                onConfirmDelete={() => void onDelete(comment.id)}
              />

              {(comment.replies ?? []).length > 0 ? (
                <ul className="border-line ml-3 border-l pl-4">
                  {comment.replies?.map((reply) => (
                    <li key={reply.id}>
                      <CommentLine
                        comment={reply}
                        isReply
                        confirming={confirming}
                        pending={pending}
                        onAskDelete={() => {
                          setError(null);
                          setReplyingTo(null);
                          setConfirming(reply.id);
                        }}
                        onCancelDelete={() => setConfirming(null)}
                        onConfirmDelete={() => void onDelete(reply.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              {replyingTo === comment.id ? (
                <form onSubmit={onReply} className="mb-3 ml-3 flex gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Repondre au nom de la boutique…"
                    disabled={pending}
                    className="admin-input"
                  />
                  <button
                    type="submit"
                    disabled={pending || draft.trim() === ""}
                    className="admin-button shrink-0"
                  >
                    {pending ? "Envoi…" : "Repondre"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setReplyingTo(null);
                      setDraft("");
                    }}
                    className="admin-button-ghost shrink-0"
                  >
                    Annuler
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-brand mt-3 text-[13px]">{error}</p> : null}
    </Modal>
  );
}

/**
 * Une ligne du fil : meme forme pour un commentaire et pour une reponse.
 *
 * Definie au niveau du module, pas dans la modale : un composant recree a
 * chaque rendu est un type neuf pour React, qui remonterait tout le fil a
 * chaque frappe dans le champ de reponse.
 */
function CommentLine({
  comment,
  isReply = false,
  confirming,
  pending,
  onAskReply,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  comment: PostComment;
  isReply?: boolean;
  confirming: string | null;
  pending: boolean;
  /** Absent sur une reponse : le fil ne descend qu'a un niveau. */
  onAskReply?: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">
          {/* Une reponse ne peut venir que d'une route admin : c'est la
              boutique qui parle, pas la personne derriere le backoffice. */}
          {isReply ? "Futurama.mg" : comment.user.fullName}
          {isReply ? (
            <span className="bg-tint-cool text-tint-cool-ink ml-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold">
              Boutique
            </span>
          ) : null}
          <span className="text-muted-light ml-2 text-[12px] font-normal">
            {formatDateTime(comment.createdAt)}
          </span>
        </p>
        <p className="text-ink/85 mt-0.5 text-[13px] whitespace-pre-line">
          {comment.comment}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 text-[12.5px] font-bold">
        {confirming === comment.id ? (
          <>
            <span className="text-muted font-normal">Retirer ?</span>
            <button
              type="button"
              disabled={pending}
              onClick={onConfirmDelete}
              className="text-brand hover:underline disabled:opacity-50"
            >
              {pending ? "Suppression…" : "Oui"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onCancelDelete}
              className="text-muted hover:text-ink"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            {onAskReply ? (
              <button
                type="button"
                onClick={onAskReply}
                className="text-navy hover:text-brand"
              >
                Repondre
              </button>
            ) : null}
            <button
              type="button"
              onClick={onAskDelete}
              className="text-brand hover:underline"
            >
              Supprimer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
