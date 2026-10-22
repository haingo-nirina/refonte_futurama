"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Modal } from "@/components/admin/modal";
import { ApiError } from "@/lib/api";
import {
  createDeliveryZone,
  deleteDeliveryZone,
  updateDeliveryZone,
} from "@/lib/admin-api";
import { formatPrice, toAmount } from "@/lib/format";
import type { DeliveryZoneDetail, DeliveryZoneInput } from "@/lib/types";

/** Les champs numeriques restent en texte le temps de la saisie. */
type Draft = {
  name: string;
  price: string;
  delayDays: string;
  freeThreshold: string;
  displayOrder: string;
  isActive: boolean;
};

const EMPTY: Draft = {
  name: "",
  price: "",
  delayDays: "1",
  freeThreshold: "",
  displayOrder: "0",
  isActive: true,
};

function toDraft(zone: DeliveryZoneDetail): Draft {
  return {
    name: zone.name,
    price: String(toAmount(zone.price)),
    delayDays: String(zone.delayDays),
    freeThreshold:
      zone.freeThreshold === null ? "" : String(toAmount(zone.freeThreshold)),
    displayOrder: String(zone.displayOrder),
    isActive: zone.isActive,
  };
}

function toPayload(draft: Draft): DeliveryZoneInput {
  return {
    name: draft.name.trim(),
    price: Number(draft.price),
    delayDays: Number(draft.delayDays),
    // Champ vide : pas de seuil, la livraison n'est jamais offerte.
    freeThreshold:
      draft.freeThreshold.trim() === "" ? null : Number(draft.freeThreshold),
    displayOrder: Number(draft.displayOrder) || 0,
    isActive: draft.isActive,
  };
}

type Editing =
  | { mode: "create" }
  | { mode: "edit"; zone: DeliveryZoneDetail }
  | null;

/**
 * Zones proposees dans le selecteur « Lieu de livraison » du panier. Le prix
 * saisi ici est celui que le backend facture : le navigateur n'envoie jamais
 * de montant a la commande.
 */
export function DeliveryZoneManager({
  zones,
}: {
  zones: DeliveryZoneDetail[];
}) {
  const router = useRouter();

  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<DeliveryZoneDetail | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startCreate() {
    setDraft({ ...EMPTY, displayOrder: String(zones.length) });
    setError(null);
    setEditing({ mode: "create" });
  }

  function startEdit(zone: DeliveryZoneDetail) {
    setDraft(toDraft(zone));
    setError(null);
    setEditing({ mode: "edit", zone });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setPending(true);
    setError(null);

    try {
      await (editing.mode === "create"
        ? createDeliveryZone(toPayload(draft))
        : updateDeliveryZone(editing.zone.id, toPayload(draft)));

      setEditing(null);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Enregistrement impossible",
      );
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!deleting) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await deleteDeliveryZone(deleting.id);
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-navy text-lg font-extrabold">
          Zones de livraison
        </h2>
        <button type="button" onClick={startCreate} className="admin-button">
          Nouvelle zone
        </button>
      </div>

      {zones.length === 0 ? (
        <p className="admin-card text-muted text-center text-[13.5px]">
          Aucune zone : la livraison est indisponible au panier.
        </p>
      ) : (
        <ul className="space-y-3">
          {zones.map((zone) => (
            <li key={zone.id} className="admin-card flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                  {zone.name}
                  {zone.isActive ? null : <InactiveBadge />}
                </p>
                <p className="text-muted text-[12px]">
                  {formatPrice(zone.price)} · {zone.delayDays} jour
                  {zone.delayDays > 1 ? "s" : ""} ouvré
                  {zone.delayDays > 1 ? "s" : ""}
                  {zone.freeThreshold
                    ? ` · offerte dès ${formatPrice(zone.freeThreshold)}`
                    : ""}
                  {" · "}
                  {zone._count.orders} commande
                  {zone._count.orders > 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex gap-3 text-[12.5px] font-bold">
                <button
                  type="button"
                  onClick={() => startEdit(zone)}
                  className="text-navy hover:text-brand"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(zone);
                  }}
                  className="text-brand hover:underline"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => (pending ? undefined : setEditing(null))}
        title={
          editing?.mode === "edit"
            ? `Modifier « ${editing.zone.name} »`
            : "Nouvelle zone de livraison"
        }
        description="Les commandes déjà passées gardent le prix et le délai de leur zone."
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="admin-label">Nom *</span>
            <input
              required
              autoFocus
              maxLength={120}
              placeholder="Antananarivo périphérie"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Prix (Ar) *</span>
            <input
              required
              type="number"
              min={0}
              step="any"
              value={draft.price}
              onChange={(event) =>
                setDraft({ ...draft, price: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Délai (jours ouvrés) *</span>
            <input
              required
              type="number"
              min={0}
              max={60}
              step={1}
              value={draft.delayDays}
              onChange={(event) =>
                setDraft({ ...draft, delayDays: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Offerte dès (Ar)</span>
            <input
              type="number"
              min={0}
              step="any"
              placeholder="Jamais offerte"
              value={draft.freeThreshold}
              onChange={(event) =>
                setDraft({ ...draft, freeThreshold: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Ordre d&apos;affichage</span>
            <input
              type="number"
              min={0}
              step={1}
              value={draft.displayOrder}
              onChange={(event) =>
                setDraft({ ...draft, displayOrder: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="flex items-center gap-2 text-[13.5px] sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) =>
                setDraft({ ...draft, isActive: event.target.checked })
              }
            />
            Proposée au panier
          </label>

          {error ? (
            <p className="text-brand text-[13px] sm:col-span-2">{error}</p>
          ) : null}

          <div className="mt-1 flex flex-wrap justify-end gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={pending}
              className="admin-button-ghost"
            >
              Annuler
            </button>
            <button type="submit" disabled={pending} className="admin-button">
              {pending
                ? "Enregistrement…"
                : editing?.mode === "edit"
                  ? "Enregistrer"
                  : "Créer la zone"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette zone ?"
        message={
          <>
            <strong>{deleting?.name}</strong> ne sera plus proposée au panier.
          </>
        }
        detail={
          deleting && deleting._count.orders > 0
            ? `Ses ${deleting._count.orders} commande(s) gardent leur zone, leur prix et leur délai : ils y sont copiés. Pour la retirer temporairement, décochez plutôt « Proposée au panier ».`
            : "Aucune commande n'a encore été livrée dans cette zone."
        }
        pending={deletePending}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export function InactiveBadge() {
  return (
    <span className="bg-cream-deep text-muted rounded-md px-2 py-0.5 text-[11px] font-bold uppercase">
      Désactivée
    </span>
  );
}
