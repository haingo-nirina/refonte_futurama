"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addCartItem } from "@/lib/api";
import { getSessionId, notifyCartUpdated } from "@/lib/session";

type Status = { kind: "idle" | "pending" | "done" } | { kind: "error"; message: string };

export function AddToCart({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const outOfStock = stock <= 0;

  async function submit(goToCart: boolean) {
    setStatus({ kind: "pending" });

    try {
      await addCartItem(getSessionId(), productId, quantity);
      notifyCartUpdated();

      if (goToCart) {
        router.push("/panier");
        return;
      }

      setStatus({ kind: "done" });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Ajout au panier impossible",
      });
    }
  }

  return (
    <div>
      <div className="border-line-strong mb-4 flex w-fit items-center overflow-hidden rounded-[10px] border-[1.5px] bg-white">
        <button
          type="button"
          aria-label="Diminuer la quantite"
          disabled={quantity <= 1 || outOfStock}
          onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          className="text-ink h-11 w-11 text-lg disabled:opacity-30"
        >
          −
        </button>
        <span className="font-display text-navy w-10 text-center text-[15px] font-bold">
          {quantity}
        </span>
        <button
          type="button"
          aria-label="Augmenter la quantite"
          disabled={quantity >= stock}
          onClick={() => setQuantity((value) => Math.min(stock, value + 1))}
          className="text-ink h-11 w-11 text-lg disabled:opacity-30"
        >
          +
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          disabled={outOfStock || status.kind === "pending"}
          onClick={() => void submit(true)}
          className="bg-brand hover:bg-brand-dark font-display h-[50px] rounded-[10px] text-[15px] font-bold text-white disabled:opacity-50"
        >
          Acheter maintenant
        </button>
        <button
          type="button"
          disabled={outOfStock || status.kind === "pending"}
          onClick={() => void submit(false)}
          className="border-brand text-brand font-display h-[50px] rounded-[10px] border-[1.5px] bg-white text-[15px] font-bold disabled:opacity-50"
        >
          {status.kind === "pending" ? "Ajout…" : "Ajouter au panier"}
        </button>
      </div>

      {outOfStock ? (
        <p className="text-muted mt-3 text-[13px]">
          Ce produit est actuellement en rupture.
        </p>
      ) : null}

      {status.kind === "done" ? (
        <p className="text-success mt-3 text-[13px] font-medium">
          Ajoute au panier.
        </p>
      ) : null}

      {status.kind === "error" ? (
        <p className="text-brand mt-3 text-[13px] font-medium">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
