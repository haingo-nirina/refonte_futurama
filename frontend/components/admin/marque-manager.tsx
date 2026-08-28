"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ImageUpload } from "@/components/admin/image-upload";
import { Modal } from "@/components/admin/modal";
import { ProductImage } from "@/components/product-image";
import { ApiError } from "@/lib/api";
import { createMarque, deleteMarque, updateMarque } from "@/lib/admin-api";
import type { MarqueDetail, MarqueInput } from "@/lib/types";

/** `name` -> `slug` : meme regle que la contrainte du DTO backend. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Draft = { name: string; slug: string; logoUrl: string };

const EMPTY: Draft = { name: "", slug: "", logoUrl: "" };

function toDraft(marque: MarqueDetail): Draft {
  return {
    name: marque.name,
    slug: marque.slug,
    logoUrl: marque.logoUrl ?? "",
  };
}

function toPayload(draft: Draft): MarqueInput {
  return {
    name: draft.name.trim(),
    slug: draft.slug.trim() || slugify(draft.name),
    // Chaine vide refusee par `@IsImageRef()` : on omet plutot le champ.
    logoUrl: draft.logoUrl.trim() || undefined,
  };
}

/** `null` = aucune modale ouverte ; sinon creation ou edition d'une marque. */
type Editing =
  | { mode: "create" }
  | { mode: "edit"; marque: MarqueDetail }
  | null;

/**
 * Les marques sont peu nombreuses et tiennent en trois champs : liste et
 * edition partagent la meme page, le formulaire s'ouvrant en modale — comme
 * les categories, et pour la meme raison (la liste ne se decale pas sous les
 * yeux a chaque ouverture).
 */
export function MarqueManager({ marques }: { marques: MarqueDetail[] }) {
  const router = useRouter();

  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<MarqueDetail | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startCreate() {
    setDraft(EMPTY);
    setError(null);
    setEditing({ mode: "create" });
  }

  function startEdit(marque: MarqueDetail) {
    setDraft(toDraft(marque));
    setError(null);
    setEditing({ mode: "edit", marque });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setPending(true);
    setError(null);

    try {
      await (editing.mode === "create"
        ? createMarque(toPayload(draft))
        : updateMarque(editing.marque.id, toPayload(draft)));

      setEditing(null);
      // La page est un Server Component : c'est au serveur de relire.
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
      await deleteMarque(deleting.id);
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
          Nouvelle marque
        </button>
      </div>

      {marques.length === 0 ? (
        <p className="admin-card text-muted text-center text-[13.5px]">
          Aucune marque pour le moment.
        </p>
      ) : (
        <ul className="space-y-3">
          {marques.map((marque) => (
            <li key={marque.id} className="admin-card flex items-center gap-4">
              <div className="border-line size-12 shrink-0 overflow-hidden rounded-[10px] border">
                <ProductImage
                  src={marque.logoUrl}
                  alt={marque.name}
                  className="h-full w-full"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">{marque.name}</p>
                <p className="text-muted text-[12px]">
                  /{marque.slug} ·{" "}
                  {marque._count.products === 0 ? (
                    "aucun produit"
                  ) : (
                    <Link
                      href={`/admin/produits?q=${encodeURIComponent(marque.name)}`}
                      className="hover:text-brand underline"
                    >
                      {marque._count.products} produit
                      {marque._count.products > 1 ? "s" : ""}
                    </Link>
                  )}
                </p>
              </div>

              <div className="flex gap-3 text-[12.5px] font-bold">
                <button
                  type="button"
                  onClick={() => startEdit(marque)}
                  className="text-navy hover:text-brand"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(marque);
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
            ? `Modifier « ${editing.marque.name} »`
            : "Nouvelle marque"
        }
        description="Le nom est ce que la boutique affiche dans le filtre « Marques »."
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="admin-label">Nom *</span>
            <input
              required
              autoFocus
              value={draft.name}
              onChange={(event) => {
                const name = event.target.value;
                setDraft((current) => ({
                  ...current,
                  name,
                  // Le slug suit le nom tant qu'il n'a pas ete touche a la main.
                  slug:
                    current.slug === slugify(current.name) || current.slug === ""
                      ? slugify(name)
                      : current.slug,
                }));
              }}
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Slug *</span>
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              title="minuscules, mots separes par des tirets"
              value={draft.slug}
              onChange={(event) =>
                setDraft({ ...draft, slug: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <div className="sm:col-span-2">
            <span className="admin-label">Logo</span>
            <ImageUpload
              value={draft.logoUrl}
              onChange={(url) => setDraft({ ...draft, logoUrl: url })}
              alt={draft.name}
              kind="marques"
            />
          </div>

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
                  : "Creer la marque"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette marque ?"
        message={
          <>
            <strong>{deleting?.name}</strong> disparaitra du filtre
            «&nbsp;Marques&nbsp;» de la boutique.
          </>
        }
        detail={
          deleting && deleting._count.products > 0
            ? `Ses ${deleting._count.products} produit(s) ne sont pas supprimes : ils sont simplement detaches de la marque.`
            : "Aucun produit n'est rattache a cette marque."
        }
        pending={deletePending}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
