"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, deleteReview, updateReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ProductReview } from "@/lib/types";
import { RatingPicker } from "./rating-picker";
import { Stars } from "./stars";

/** Initiale de l'avatar ; le nom vient du compte, il n'est jamais vide. */
function initial(fullName: string): string {
  return fullName.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Un avis publie reste modifiable et supprimable — par son auteur seul. Le
 * backend le verifie de son cote (403) : ce qui suit ne fait que masquer des
 * boutons inutiles aux autres visiteurs.
 *
 * `date` arrive deja formatee : la calculer ici donnerait un texte different
 * de celui du rendu serveur, et l'hydratation s'en plaindrait.
 */
export function ReviewItem({
  review,
  date,
}: {
  review: ProductReview;
  date: string;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthor = user?.id === review.user.id;

  function fail(cause: unknown, fallback: string) {
    // Token expire pendant que la page etait ouverte.
    if (cause instanceof ApiError && cause.status === 401) {
      router.push(
        `/connexion?next=${encodeURIComponent(`/produit/${review.productId}`)}`,
      );
      return;
    }

    setError(cause instanceof ApiError ? cause.message : fallback);
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      // `null` retire le commentaire ; `undefined` le laisserait en place.
      await updateReview(review.id, {
        rating,
        comment: comment.trim() || null,
      });
      setEditing(false);
      // La liste est rendue cote serveur : c'est a lui de la relire.
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
      await deleteReview(review.id);
      router.refresh();
    } catch (cause) {
      fail(cause, "Suppression impossible");
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <li className="border-line flex flex-col gap-1.5 border-b py-5 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-tint-cool text-tint-cool-ink font-display flex size-[34px] items-center justify-center rounded-full text-[13px] font-bold">
            {initial(review.user.fullName)}
          </span>
          <div className="flex flex-col">
            <span className="text-ink text-[13.5px] font-semibold">
              {review.user.fullName}
            </span>
            <span className="text-muted text-[11.5px]">{date}</span>
          </div>
        </div>
        {editing ? null : <Stars value={review.rating} className="text-[14px]" />}
      </div>

      {editing ? (
        <form onSubmit={onSave} className="mt-1 flex flex-col gap-2.5">
          <RatingPicker value={rating} onChange={setRating} disabled={pending} />

          <textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Qu'avez-vous pense de ce produit ?"
            className="border-line-strong focus:border-brand resize-y rounded-[9px] border-[1.5px] bg-white px-3.5 py-2.5 text-[13.5px] outline-none"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand hover:bg-brand-dark font-display rounded-[9px] px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-50"
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setRating(review.rating);
                setComment(review.comment ?? "");
                setError(null);
              }}
              className="text-muted hover:text-brand text-[12.5px] font-bold"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <>
          {review.comment ? (
            <p className="text-ink/85 text-[13.5px] leading-relaxed">
              {review.comment}
            </p>
          ) : null}

          {isAuthor ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[12.5px] font-bold">
              {confirming ? (
                <>
                  <span className="text-muted font-normal">
                    Supprimer votre avis ?
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void onDelete()}
                    className="text-brand hover:underline disabled:opacity-50"
                  >
                    {pending ? "Suppression…" : "Oui, supprimer"}
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
            </div>
          ) : null}
        </>
      )}

      {error ? <p className="text-brand text-[12.5px]">{error}</p> : null}
    </li>
  );
}
