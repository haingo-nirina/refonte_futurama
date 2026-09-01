"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ApiError } from "@/lib/api";
import { deleteProduct } from "@/lib/admin-api";
import type { AdminProduct } from "@/lib/types";

/**
 * La fiche d'edition porte deja ces deux actions, mais les atteindre depuis la
 * liste evite un aller-retour pour la plus courante des deux — et la
 * suppression depuis un tableau est ce qu'on cherche a cet endroit.
 */
export function ProductRowActions({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setPending(true);
    setError(null);

    try {
      await deleteProduct(product.id);
      setConfirming(false);
      // La page est un Server Component : c'est au serveur de relire la liste.
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Suppression impossible",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-3 text-[12.5px] font-bold">
        <Link
          href={`/admin/produits/${product.id}`}
          className="text-navy hover:text-brand"
        >
          Modifier
        </Link>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="text-brand hover:underline disabled:opacity-50"
        >
          Supprimer
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Supprimer ce produit ?"
        message={
          <>
            <strong>{product.name}</strong> sera retire du catalogue, avec sa
            galerie, ses caracteristiques, ses avis et ses produits lies.
          </>
        }
        detail="Les commandes deja passees ne bougent pas : elles gardent le nom et le prix figes au moment de l'achat. Pour retirer le produit de la vente sans rien perdre, decochez plutot « En ligne » dans la fiche."
        pending={pending}
        error={error}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
