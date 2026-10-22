"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { InactiveBadge } from "@/components/admin/delivery-zone-manager";
import { Modal } from "@/components/admin/modal";
import { ApiError } from "@/lib/api";
import { createStore, deleteStore, updateStore } from "@/lib/admin-api";
import { pickupAvailability } from "@/lib/checkout";
import type { StoreDetail, StoreInput } from "@/lib/types";

type Draft = {
  name: string;
  address: string;
  phone: string;
  openingHours: string;
  latitude: string;
  longitude: string;
  pickupDelayDays: string;
  isActive: boolean;
};

const EMPTY: Draft = {
  name: "",
  address: "",
  phone: "",
  openingHours: "",
  latitude: "",
  longitude: "",
  pickupDelayDays: "0",
  isActive: true,
};

function toDraft(store: StoreDetail): Draft {
  return {
    name: store.name,
    address: store.address,
    phone: store.phone,
    openingHours: store.openingHours,
    latitude: store.latitude ?? "",
    longitude: store.longitude ?? "",
    pickupDelayDays: String(store.pickupDelayDays),
    isActive: store.isActive,
  };
}

/** Champ vide : `null`, la carte se centre alors sur le resultat de la recherche. */
function toCoordinate(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function toPayload(draft: Draft): StoreInput {
  return {
    name: draft.name.trim(),
    address: draft.address.trim(),
    phone: draft.phone.trim(),
    openingHours: draft.openingHours.trim(),
    latitude: toCoordinate(draft.latitude),
    longitude: toCoordinate(draft.longitude),
    pickupDelayDays: Number(draft.pickupDelayDays) || 0,
    isActive: draft.isActive,
  };
}

type Editing = { mode: "create" } | { mode: "edit"; store: StoreDetail } | null;

/**
 * Boutiques proposees dans « Choisissez votre boutique » au panier. Le delai
 * de preparation alimente le badge « En stock » / « Prêt sous N jours ».
 */
export function StoreManager({ stores }: { stores: StoreDetail[] }) {
  const router = useRouter();

  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<StoreDetail | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startCreate() {
    setDraft(EMPTY);
    setError(null);
    setEditing({ mode: "create" });
  }

  function startEdit(store: StoreDetail) {
    setDraft(toDraft(store));
    setError(null);
    setEditing({ mode: "edit", store });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setPending(true);
    setError(null);

    try {
      await (editing.mode === "create"
        ? createStore(toPayload(draft))
        : updateStore(editing.store.id, toPayload(draft)));

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
      await deleteStore(deleting.id);
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
          Boutiques de retrait
        </h2>
        <button type="button" onClick={startCreate} className="admin-button">
          Nouvelle boutique
        </button>
      </div>

      {stores.length === 0 ? (
        <p className="admin-card text-muted text-center text-[13.5px]">
          Aucune boutique : le retrait est indisponible au panier.
        </p>
      ) : (
        <ul className="space-y-3">
          {stores.map((store) => (
            <li key={store.id} className="admin-card flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                  {store.name}
                  {store.isActive ? null : <InactiveBadge />}
                </p>
                <p className="text-muted text-[12px]">{store.address}</p>
                <p className="text-muted text-[12px]">
                  {store.phone} · {pickupAvailability(store)} ·{" "}
                  {store._count.orders} retrait
                  {store._count.orders > 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex gap-3 text-[12.5px] font-bold">
                <button
                  type="button"
                  onClick={() => startEdit(store)}
                  className="text-navy hover:text-brand"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(store);
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
            ? `Modifier « ${editing.store.name} »`
            : "Nouvelle boutique"
        }
        description="Telle qu'elle apparaît au panier, sous « Choisissez votre boutique »."
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="admin-label">Nom *</span>
            <input
              required
              autoFocus
              maxLength={120}
              placeholder="Futurama Tsaralalana"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="admin-label">Adresse *</span>
            <input
              required
              maxLength={300}
              value={draft.address}
              onChange={(event) =>
                setDraft({ ...draft, address: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Téléphone *</span>
            <input
              required
              type="tel"
              maxLength={30}
              placeholder="+261 32 69 521 24"
              value={draft.phone}
              onChange={(event) =>
                setDraft({ ...draft, phone: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Délai de préparation (jours)</span>
            <input
              type="number"
              min={0}
              max={60}
              step={1}
              value={draft.pickupDelayDays}
              onChange={(event) =>
                setDraft({ ...draft, pickupDelayDays: event.target.value })
              }
              className="admin-input"
            />
            <span className="text-muted mt-1 block text-[11.5px]">
              0 affiche « En stock », sinon « Prêt sous N jours »
            </span>
          </label>

          <label className="block sm:col-span-2">
            <span className="admin-label">Horaires *</span>
            <textarea
              required
              rows={2}
              maxLength={300}
              placeholder={"Lun–Sam 8h30–18h\nDim 9h–12h"}
              value={draft.openingHours}
              onChange={(event) =>
                setDraft({ ...draft, openingHours: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Latitude</span>
            <input
              type="number"
              step="any"
              min={-90}
              max={90}
              placeholder="-18.9100"
              value={draft.latitude}
              onChange={(event) =>
                setDraft({ ...draft, latitude: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Longitude</span>
            <input
              type="number"
              step="any"
              min={-180}
              max={180}
              placeholder="47.5250"
              value={draft.longitude}
              onChange={(event) =>
                setDraft({ ...draft, longitude: event.target.value })
              }
              className="admin-input"
            />
          </label>
          <p className="text-muted -mt-1 text-[11.5px] sm:col-span-2">
            Elles centrent seulement la carte : Google retrouve la boutique par son nom et son adresse, à écrire comme sur sa fiche Google Maps.
          </p>

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
                  : "Créer la boutique"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette boutique ?"
        message={
          <>
            <strong>{deleting?.name}</strong> ne sera plus proposée au retrait.
          </>
        }
        detail={
          deleting && deleting._count.orders > 0
            ? `${deleting._count.orders} commande(s) y ont été retirées : la suppression sera refusée. Décochez plutôt « Proposée au panier ».`
            : "Aucune commande n'a encore été retirée dans cette boutique."
        }
        pending={deletePending}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
