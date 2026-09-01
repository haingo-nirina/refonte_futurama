"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, createReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { RatingPicker } from "./rating-picker";

/**
 * Deposer un avis exige un compte, comme commander : le backend lit l'auteur
 * sur le JWT et refuse un `userId` dans le corps. La maquette montre un champ
 * « Votre nom » — il n'a plus lieu d'etre, le nom vient du compte.
 */
export function ReviewForm({
  productId,
  authorIds,
}: {
  productId: string;
  /** Comptes ayant deja un avis ici : la contrainte est d'un avis par compte. */
  authorIds: string[];
}) {
  const router = useRouter();
  const { user } = useAuth();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const loginHref = `/connexion?next=${encodeURIComponent(`/produit/${productId}`)}`;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await createReview({
        productId,
        rating,
        comment: comment.trim() || undefined,
      });

      // L'avis est publie directement : la liste est rendue cote serveur,
      // c'est donc au serveur de la relire pour l'y faire apparaitre. Le
      // nouvel avis ouvre la premiere page — depuis une autre, il resterait
      // invisible alors que le message annonce le contraire.
      setSent(true);
      router.replace(`/produit/${productId}#avis`);
      router.refresh();
    } catch (cause) {
      // Token expire pendant que la page etait ouverte : on renvoie se
      // reconnecter plutot que d'afficher un « Unauthorized » brut.
      if (cause instanceof ApiError && cause.status === 401) {
        router.push(loginHref);
        return;
      }

      setError(
        cause instanceof ApiError ? cause.message : "Avis non enregistre",
      );
    } finally {
      setPending(false);
    }
  }

  // Avant hydratation on ne sait pas encore si le visiteur est connecte.
  if (user === undefined) {
    return (
      <div className="bg-cream-deep text-muted rounded-[14px] p-5.5 text-[13.5px]">
        Chargement…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-cream-deep rounded-[14px] p-5.5">
        <h3 className="font-display text-navy text-[15px] font-bold">
          Connectez-vous pour laisser un avis
        </h3>
        <p className="text-muted mt-2 text-[13px]">
          Votre nom d&apos;utilisateur signera le commentaire.
        </p>
        <Link
          href={loginHref}
          className="bg-brand hover:bg-brand-dark font-display mt-4 inline-block rounded-[9px] px-5.5 py-3 text-[14px] font-bold text-white transition"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  // Un second avis serait refuse en 409 : on renvoie plutot vers le sien, que
  // l'auteur peut modifier ou supprimer depuis la liste.
  if (!sent && authorIds.includes(user.id)) {
    return (
      <div className="bg-cream-deep rounded-[14px] p-5.5">
        <h3 className="font-display text-navy text-[15px] font-bold">
          Vous avez deja donne votre avis
        </h3>
        <p className="text-muted mt-2 text-[13px]">
          Retrouvez-le dans la liste : vous pouvez le modifier ou le supprimer a
          tout moment.
        </p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="bg-success-soft rounded-[14px] p-5.5">
        <h3 className="font-display text-success text-[15px] font-bold">
          Merci pour votre avis
        </h3>
        <p className="text-ink/80 mt-2 text-[13px]">
          Il est publie sur cette page, juste a cote.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-cream-deep flex flex-col gap-3 rounded-[14px] p-5.5"
    >
      <div className="font-display text-navy text-[15px] font-bold">
        Laisser un commentaire
      </div>

      <RatingPicker value={rating} onChange={setRating} disabled={pending} />

      <textarea
        rows={3}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Qu'avez-vous pense de ce produit ?"
        className="border-line-strong focus:border-brand resize-y rounded-[9px] border-[1.5px] bg-white px-3.5 py-2.5 text-[13.5px] outline-none"
      />

      {error ? <p className="text-brand text-[12.5px]">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand hover:bg-brand-dark font-display self-start rounded-[9px] px-5.5 py-3 text-[14px] font-bold text-white transition disabled:opacity-50"
      >
        {pending ? "Envoi…" : "Publier l'avis"}
      </button>

      <p className="text-muted-light text-[12px]">
        Un avis par produit et par compte.
      </p>
    </form>
  );
}
