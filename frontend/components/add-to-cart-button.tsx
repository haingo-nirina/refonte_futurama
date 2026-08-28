"use client";

import { useState } from "react";
import { addCartItem } from "@/lib/api";
import { getSessionId, notifyCartUpdated } from "@/lib/session";

type Status = "idle" | "pending" | "done" | "error";

/**
 * Ajout d'une piece depuis la grille catalogue. La fiche produit garde son
 * `AddToCart` (quantite, achat immediat) : ici il n'y a la place que pour le
 * geste principal.
 */
export function AddToCartButton({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const [status, setStatus] = useState<Status>("idle");

  if (stock <= 0) {
    return (
      <span className="border-line-strong text-muted-light font-display self-start rounded-full border px-4 py-2 text-[11.5px] font-bold">
        Indisponible
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={status === "pending"}
      onClick={async () => {
        setStatus("pending");

        try {
          await addCartItem(getSessionId(), productId, 1);
          notifyCartUpdated();
          setStatus("done");
        } catch {
          setStatus("error");
        }
      }}
      className="bg-brand hover:bg-brand-dark font-display self-start rounded-full px-4 py-2 text-[11.5px] font-bold text-white transition disabled:opacity-60"
    >
      {LABELS[status]}
    </button>
  );
}

const LABELS: Record<Status, string> = {
  idle: "Ajouter au panier",
  pending: "Ajout…",
  done: "Ajoute ✓",
  error: "Reessayer",
};
