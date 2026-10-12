"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { moderateReview } from "@/lib/admin-api";
import type { ModerationStatus } from "@/lib/types";

type Decision = Exclude<ModerationStatus, "pending">;

/**
 * Valider publie l'avis sur la fiche produit, rejeter le garde masque. Les
 * deux restent proposes une fois la decision prise : un avis publie peut etre
 * retire, un avis rejete repeche — sans action « annuler » a part.
 */
export function ReviewModeration({
  reviewId,
  status,
}: {
  reviewId: string;
  status: ModerationStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: Decision) {
    setPending(decision);
    setError(null);

    try {
      await moderateReview(reviewId, decision);
      // La liste est un Server Component : c'est au serveur de la relire.
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Moderation impossible",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "approved" ? (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void decide("approved")}
          className="admin-button"
        >
          {pending === "approved" ? "Publication…" : "Valider et publier"}
        </button>
      ) : null}
      {status !== "rejected" ? (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void decide("rejected")}
          className="admin-button-ghost"
        >
          {pending === "rejected"
            ? "…"
            : status === "approved"
              ? "Retirer de la fiche"
              : "Rejeter"}
        </button>
      ) : null}
      {error ? <p className="text-brand w-full text-[12.5px]">{error}</p> : null}
    </div>
  );
}
