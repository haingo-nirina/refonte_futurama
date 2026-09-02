"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Modal } from "@/components/admin/modal";
import { ProductPicker } from "@/components/admin/product-picker";
import {
  FeaturedBadge,
  PromotionStatusBadge,
  promotionState,
} from "@/components/admin/status-badge";
import { ApiError } from "@/lib/api";
import {
  createPromotion,
  deletePromotion,
  updatePromotion,
} from "@/lib/admin-api";
import { formatDate, formatPrice, toDateInputValue } from "@/lib/format";
import type { Promotion, PromotionInput } from "@/lib/types";

type Draft = {
  productId: string;
  productName: string;
  titre: string;
  discountPercent: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFeatured: boolean;
};

const EMPTY: Draft = {
  productId: "",
  productName: "",
  titre: "",
  discountPercent: "",
  startDate: "",
  endDate: "",
  isActive: true,
  isFeatured: false,
};

function toDraft(promotion: Promotion): Draft {
  return {
    productId: promotion.productId,
    productName: promotion.product.name,
    titre: promotion.titre ?? "",
    discountPercent: promotion.discountPercent,
    startDate: toDateInputValue(promotion.startDate),
    endDate: toDateInputValue(promotion.endDate),
    isActive: promotion.isActive,
    isFeatured: promotion.isFeatured,
  };
}

/**
 * Memes regles que les DTO backend, verifiees avant l'aller-retour reseau.
 * Le backend revalide de son cote : ceci n'est qu'un confort de saisie.
 */
function validate(draft: Draft): string | null {
  if (!draft.productId) return "Choisissez un produit.";

  const percent = Number(draft.discountPercent);
  if (!draft.discountPercent.trim() || Number.isNaN(percent)) {
    return "La remise doit etre un nombre.";
  }
  if (percent < 0 || percent > 100) {
    return "La remise doit etre comprise entre 0 et 100.";
  }

  if (!draft.startDate || !draft.endDate) {
    return "Les deux dates sont obligatoires.";
  }
  if (
    new Date(draft.endDate).getTime() <= new Date(draft.startDate).getTime()
  ) {
    return "La date de fin doit etre posterieure a la date de debut.";
  }

  return null;
}

function toPayload(draft: Draft): PromotionInput {
  return {
    productId: draft.productId,
    // Chaine vide -> `null` : le backend distingue « pas de titre » de
    // « champ non fourni ».
    titre: draft.titre.trim() || null,
    discountPercent: Number(draft.discountPercent),
    startDate: new Date(draft.startDate).toISOString(),
    endDate: new Date(draft.endDate).toISOString(),
    isActive: draft.isActive,
    isFeatured: draft.isFeatured,
  };
}

type Editing =
  { mode: "create" } | { mode: "edit"; promotion: Promotion } | null;

/**
 * Liste et formulaire des promotions. Le formulaire s'ouvre en modale, comme
 * celui des marques et des categories : six champs ne justifient pas une page,
 * et la liste ne se decale pas sous les yeux a chaque ouverture.
 */
export function PromotionManager({ promotions }: { promotions: Promotion[] }) {
  const router = useRouter();

  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Promotion | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /** Bascule en cours, pour ne desactiver que la ligne concernee. */
  const [toggling, setToggling] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setDraft(EMPTY);
    setError(null);
    setEditing({ mode: "create" });
  }

  function startEdit(promotion: Promotion) {
    setDraft(toDraft(promotion));
    setError(null);
    setEditing({ mode: "edit", promotion });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    const invalid = validate(draft);
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(true);
    setError(null);

    try {
      await (editing.mode === "create"
        ? createPromotion(toPayload(draft))
        : updatePromotion(editing.promotion.id, toPayload(draft)));

      setEditing(null);
      // La page est un Server Component : c'est au serveur de relire.
      router.refresh();
    } catch (cause) {
      // 409 = chevauchement avec une autre promotion active du meme produit.
      // Le message du backend nomme les dates en conflit, il vaut mieux que
      // n'importe quelle reformulation.
      setError(
        cause instanceof ApiError ? cause.message : "Enregistrement impossible",
      );
    } finally {
      setPending(false);
    }
  }

  /**
   * Reactiver peut echouer en 409 si une autre promotion active couvre deja
   * ces dates : l'erreur s'affiche sous la ligne plutot que d'etre avalee.
   */
  async function onToggle(promotion: Promotion) {
    setToggling(promotion.id);
    setToggleError(null);

    try {
      await updatePromotion(promotion.id, { isActive: !promotion.isActive });
      router.refresh();
    } catch (cause) {
      setToggleError({
        id: promotion.id,
        message:
          cause instanceof ApiError ? cause.message : "Changement impossible",
      });
    } finally {
      setToggling(null);
    }
  }

  async function onDelete() {
    if (!deleting) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await deletePromotion(deleting.id);
      setDeleting(null);
      router.refresh();
    } catch (cause) {
      setDeleteError(
        cause instanceof ApiError ? cause.message : "Suppression impossible",
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={startCreate} className="admin-button">
          Creer une promotion
        </button>
      </div>

      {promotions.length === 0 ? (
        <p className="admin-card text-muted text-center text-[13.5px]">
          Aucune promotion ne correspond a ces filtres.
        </p>
      ) : (
        <div className="border-line overflow-x-auto rounded-[14px] border bg-white">
          <table className="w-full min-w-[880px] text-[13px]">
            <thead className="border-line text-muted border-b text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Titre</th>
                <th className="px-4 py-3 font-semibold">Produit</th>
                <th className="px-4 py-3 font-semibold">Remise</th>
                <th className="px-4 py-3 font-semibold">Periode</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-line divide-y">
              {promotions.map((promotion) => (
                <tr key={promotion.id}>
                  <td className="px-4 py-3">
                    <span className="font-semibold">
                      {promotion.titre ?? (
                        <span className="text-muted-light font-normal">
                          Sans titre
                        </span>
                      )}
                    </span>
                    {promotion.isFeatured ? (
                      <span className="mt-1 block">
                        <FeaturedBadge />
                      </span>
                    ) : null}
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/produits/${promotion.productId}`}
                      className="hover:text-brand font-semibold"
                    >
                      {promotion.product.name}
                    </Link>
                    <span className="text-muted-light block text-[11.5px]">
                      {formatPrice(promotion.basePrice)} →{" "}
                      {formatPrice(promotion.discountedPrice)}
                    </span>
                  </td>

                  <td className="font-display text-navy px-4 py-3 font-extrabold">
                    -{promotion.discountPercent} %
                  </td>

                  <td className="text-muted px-4 py-3 whitespace-nowrap">
                    {formatDate(promotion.startDate)}
                    <span className="text-muted-light"> → </span>
                    {formatDate(promotion.endDate)}
                  </td>

                  <td className="px-4 py-3">
                    <PromotionStatusBadge state={promotionState(promotion)} />
                    {toggleError?.id === promotion.id ? (
                      <span className="text-brand mt-1 block text-[11.5px]">
                        {toggleError.message}
                      </span>
                    ) : null}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3 text-[12.5px] font-bold">
                      <button
                        type="button"
                        onClick={() => void onToggle(promotion)}
                        disabled={toggling === promotion.id}
                        className="text-navy hover:text-brand disabled:opacity-50"
                      >
                        {toggling === promotion.id
                          ? "…"
                          : promotion.isActive
                            ? "Desactiver"
                            : "Activer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(promotion)}
                        className="text-navy hover:text-brand"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleting(promotion);
                        }}
                        className="text-brand hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => (pending ? undefined : setEditing(null))}
        title={
          editing?.mode === "edit"
            ? "Modifier la promotion"
            : "Nouvelle promotion"
        }
        description="Le prix reduit se calcule a partir du prix du produit : il n'est jamais saisi ni stocke."
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="admin-label">Produit</span>
            <ProductPicker
              value={draft.productId}
              selectedLabel={draft.productName}
              disabled={pending}
              onSelect={(product) => {
                set("productId", product?.id ?? "");
                set("productName", product?.name ?? "");
              }}
            />
          </div>

          <label className="block sm:col-span-2">
            <span className="admin-label">Titre</span>
            <input
              type="text"
              value={draft.titre}
              onChange={(event) => set("titre", event.target.value)}
              placeholder="Promotion du mois - Septembre 2026"
              maxLength={160}
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Remise (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={draft.discountPercent}
              onChange={(event) => set("discountPercent", event.target.value)}
              required
              className="admin-input"
            />
          </label>

          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => set("isActive", event.target.checked)}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={draft.isFeatured}
                onChange={(event) => set("isFeatured", event.target.checked)}
              />
              Mettre en avant comme promotion du mois
            </label>
          </div>

          <label className="block">
            <span className="admin-label">Debut</span>
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => set("startDate", event.target.value)}
              required
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Fin</span>
            <input
              type="date"
              value={draft.endDate}
              // Le navigateur bloque deja les dates anterieures ; `validate()`
              // reprend la regle pour les saisies au clavier.
              min={draft.startDate || undefined}
              onChange={(event) => set("endDate", event.target.value)}
              required
              className="admin-input"
            />
          </label>

          {error ? (
            <p className="text-brand sm:col-span-2 text-[13px]">{error}</p>
          ) : null}

          <div className="mt-2 flex justify-end gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={pending}
              className="admin-button-ghost"
            >
              Annuler
            </button>
            <button type="submit" disabled={pending} className="admin-button">
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette promotion ?"
        message={
          <>
            La promotion sur <strong>{deleting?.product.name}</strong> sera
            definitivement supprimee.
          </>
        }
        detail="Le produit reprend son prix catalogue. Pour la retirer sans la perdre, utilisez plutot « Desactiver »."
        pending={deletePending}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
