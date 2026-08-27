"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { moderateReview } from "@/lib/admin-api";
import type { ModerationStatus } from "@/lib/types";

/**
 * La moderation ne mene qu'a un etat terminal : un avis deja approuve ou
 * rejete n'a plus de bouton, le backend refusant de repasser en `pending`.
 */
export function ReviewModeration({
  reviewId,
  status,
}: {
  reviewId: string;
  status: ModerationStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "pending") return null;

  async function decide(decision: "approved" | "rejected") {
    setPending(true);
    setError(null);

    try {
      await moderateReview(reviewId, decision);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Moderation impossible",
      );
      setPending(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void decide("approved")}
          className="bg-success rounded-[9px] px-3 py-2 text-[12.5px] font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Approuver
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void decide("rejected")}
          className="border-line-strong text-muted hover:border-brand hover:text-brand rounded-[9px] border bg-white px-3 py-2 text-[12.5px] font-bold transition disabled:opacity-50"
        >
          Rejeter
        </button>
      </div>
      {error ? <p className="text-brand text-[12px]">{error}</p> : null}
    </div>
  );
}
