"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, createReview, getMyReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { ProductReview } from "@/lib/types";
import { RatingPicker } from "./rating-picker";
import { ReviewItem } from "./review-item";

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
  // `undefined` : pas encore lu. La fiche ne liste que les avis publies, celui
  // de l'auteur peut attendre une validation — il faut le demander a part.
  const [mine, setMine] = useState<ProductReview | null | undefined>(undefined);

  const loadMine = useCallback(async () => {
    try {
      setMine(await getMyReview(productId));
    } catch {
      // Au pire on retombe sur le formulaire : le backend refusera un doublon.
      setMine(null);
    }
  }, [productId]);

  // `authorIds` change apres un `router.refresh()` : un avis publie qu'on
  // modifie repasse en attente et quitte la liste, il faut alors le relire.
  const authorKey = authorIds.join();
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture reseau
    void loadMine();
  }, [user, loadMine, authorKey]);

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

      // L'avis arrive en attente : il n'apparaitra dans la liste qu'une fois
      // valide depuis le backoffice, rien a relire ici.
      setSent(true);
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
  if (user === undefined || (user && mine === undefined && !sent)) {
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

  if (sent) {
    return (
      <div className="bg-success-soft rounded-[14px] p-5.5">
        <h3 className="font-display text-success text-[15px] font-bold">
          Merci pour votre avis
        </h3>
        <p className="text-ink/80 mt-2 text-[13px]">
          Il sera publie sur cette page apres validation par notre equipe.
        </p>
      </div>
    );
  }

  // Avis en attente ou rejete : absent de la liste publique, on le montre ici
  // a son seul auteur, qui peut encore le modifier ou le retirer.
  if (mine && mine.moderationStatus !== "approved") {
    return (
      <div className="bg-cream-deep rounded-[14px] p-5.5">
        <h3 className="font-display text-navy text-[15px] font-bold">
          {mine.moderationStatus === "pending"
            ? "Votre avis est en attente de validation"
            : "Votre avis n'a pas ete publie"}
        </h3>
        <p className="text-muted mt-2 text-[13px]">
          {mine.moderationStatus === "pending"
            ? "Il apparaitra sur cette page des que notre equipe l'aura valide."
            : "Notre equipe ne l'a pas retenu. Vous pouvez le modifier pour le soumettre a nouveau."}
        </p>
        <ul className="mt-2">
          <ReviewItem
            review={mine}
            date={formatDate(mine.createdAt)}
            onChange={loadMine}
          />
        </ul>
      </div>
    );
  }

  // Un second avis serait refuse en 409 : on renvoie plutot vers le sien, que
  // l'auteur peut modifier ou supprimer depuis la liste.
  if (mine || authorIds.includes(user.id)) {
    return (
      <div className="bg-cream-deep rounded-[14px] p-5.5">
        <h3 className="font-display text-navy text-[15px] font-bold">
          Vous avez deja donne votre avis
        </h3>
        <p className="text-muted mt-2 text-[13px]">
          Retrouvez-le dans la liste : vous pouvez le modifier ou le supprimer a
          tout moment. Une modification repasse par la validation.
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
        {pending ? "Envoi…" : "Envoyer l'avis"}
      </button>

      <p className="text-muted-light text-[12px]">
        Un avis par produit et par compte, publie apres validation.
      </p>
    </form>
  );
}
