"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ImageUpload } from "@/components/admin/image-upload";
import { Modal } from "@/components/admin/modal";
import { ApiError } from "@/lib/api";
import {
  createCategory,
  deleteCategories,
  deleteCategory,
  updateCategory,
} from "@/lib/admin-api";
import type { Category, CategoryInput } from "@/lib/types";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Draft = {
  name: string;
  slug: string;
  parentId: string;
  imageUrl: string;
  displayOrder: string;
  isFeatured: boolean;
};

const EMPTY: Draft = {
  name: "",
  slug: "",
  parentId: "",
  imageUrl: "",
  displayOrder: "0",
  isFeatured: false,
};

function toDraft(category: Category): Draft {
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId ?? "",
    imageUrl: category.imageUrl ?? "",
    displayOrder: String(category.displayOrder),
    isFeatured: category.isFeatured,
  };
}

function toPayload(draft: Draft): CategoryInput {
  return {
    name: draft.name.trim(),
    slug: draft.slug.trim() || slugify(draft.name),
    // `null` detache du parent, `undefined` laisserait la valeur en place.
    parentId: draft.parentId || null,
    imageUrl: draft.imageUrl.trim() || undefined,
    displayOrder: Number(draft.displayOrder) || 0,
    isFeatured: draft.isFeatured,
  };
}

/** `null` = aucune modale ouverte ; sinon creation ou edition d'une categorie. */
type Editing =
  | { mode: "create"; parentId: string }
  | { mode: "edit"; category: Category }
  | null;

/**
 * Arborescence et edition sur la meme page : les categories sont peu
 * nombreuses et se manipulent les unes par rapport aux autres (ordre, parent,
 * mise en avant). Le formulaire s'ouvre en modale plutot que de s'inserer dans
 * la liste, qui se decalait sous les yeux a chaque ouverture.
 */
export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();

  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Selection multiple. Apres un `router.refresh()`, on ne garde coche que ce
  // qui existe encore.
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const roots = categories.filter((category) => !category.parentId);
  const selected = categories.filter((category) => checked.has(category.id));
  const allSelected =
    categories.length > 0 && selected.length === categories.length;

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setChecked(
      allSelected
        ? new Set()
        : new Set(categories.map((category) => category.id)),
    );
  }

  async function onBulkDelete() {
    setBulkPending(true);
    setBulkError(null);

    try {
      await deleteCategories(selected.map((category) => category.id));
      setBulkConfirming(false);
      setChecked(new Set());
      router.refresh();
    } catch (cause) {
      // Tout ou rien : le backend nomme les categories encore rattachees a
      // des produits, rien n'a ete supprime.
      setBulkError(
        cause instanceof ApiError ? cause.message : "Suppression impossible",
      );
    } finally {
      setBulkPending(false);
    }
  }

  // Sous-rayons non coches dont le parent part : ils seront detaches.
  const orphaned = categories.filter(
    (category) =>
      category.parentId &&
      checked.has(category.parentId) &&
      !checked.has(category.id),
  ).length;

  function startCreate(parentId = "") {
    setDraft({ ...EMPTY, parentId });
    setError(null);
    setEditing({ mode: "create", parentId });
  }

  function startEdit(category: Category) {
    setDraft(toDraft(category));
    setError(null);
    setEditing({ mode: "edit", category });
  }

  function startDelete(category: Category) {
    setDeleteError(null);
    setDeleting(category);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setPending(true);
    setError(null);

    try {
      await (editing.mode === "create"
        ? createCategory(toPayload(draft))
        : updateCategory(editing.category.id, toPayload(draft)));

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
      await deleteCategory(deleting.id);
      setDeleting(null);
      router.refresh();
    } catch (cause) {
      // Le backend refuse en 400 une categorie encore rattachee a des produits :
      // son message est plus precis que tout ce qu'on pourrait deviner ici.
      setDeleteError(
        cause instanceof ApiError ? cause.message : "Suppression impossible",
      );
    } finally {
      setDeletePending(false);
    }
  }

  const childrenCount = deleting
    ? categories.filter((item) => item.parentId === deleting.id).length
    : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {categories.length > 0 ? (
          <SelectAllCheckbox
            checked={allSelected}
            indeterminate={!allSelected && selected.length > 0}
            onChange={toggleAll}
          />
        ) : null}
        <button
          type="button"
          onClick={() => startCreate()}
          className="admin-button ml-auto"
        >
          Nouvelle categorie
        </button>
      </div>

      {selected.length > 0 ? (
        <div className="border-line bg-cream-deep mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border px-4 py-3 text-[13.5px]">
          <span className="font-semibold">
            {allSelected
              ? `Les ${categories.length} categories sont selectionnees.`
              : `${selected.length} categorie(s) selectionnee(s).`}
          </span>
          <button
            type="button"
            onClick={() => setChecked(new Set())}
            className="text-muted hover:text-ink font-bold"
          >
            Tout deselectionner
          </button>
          <button
            type="button"
            onClick={() => {
              setBulkError(null);
              setBulkConfirming(true);
            }}
            className="admin-button ml-auto"
          >
            Supprimer ({selected.length})
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {roots.map((root) => (
          <section key={root.id} className="admin-card">
            <CategoryRow
              category={root}
              checked={checked.has(root.id)}
              onToggle={() => toggle(root.id)}
              onEdit={() => startEdit(root)}
              onRemove={() => startDelete(root)}
              onAddChild={() => startCreate(root.id)}
            />

            {root.children.length > 0 ? (
              <ul className="border-line mt-3 space-y-2 border-t pt-3 pl-4">
                {root.children.map((child) => {
                  const full = categories.find((item) => item.id === child.id);
                  if (!full) return null;

                  return (
                    <li key={child.id}>
                      <CategoryRow
                        category={full}
                        checked={checked.has(full.id)}
                        onToggle={() => toggle(full.id)}
                        onEdit={() => startEdit(full)}
                        onRemove={() => startDelete(full)}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => (pending ? undefined : setEditing(null))}
        title={
          editing?.mode === "edit"
            ? `Modifier « ${editing.category.name} »`
            : "Nouvelle categorie"
        }
        description="Les rayons de l'accueil sont ceux marques « mise en avant »."
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
                    current.slug === slugify(current.name) ||
                    current.slug === ""
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

          <label className="block">
            <span className="admin-label">Rayon parent</span>
            <select
              value={draft.parentId}
              onChange={(event) =>
                setDraft({ ...draft, parentId: event.target.value })
              }
              className="admin-input"
            >
              <option value="">Aucun (rayon principal)</option>
              {roots
                .filter(
                  (root) =>
                    editing?.mode !== "edit" || root.id !== editing.category.id,
                )
                .map((root) => (
                  <option key={root.id} value={root.id}>
                    {root.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="block">
            <span className="admin-label">Ordre d&apos;affichage</span>
            <input
              type="number"
              value={draft.displayOrder}
              onChange={(event) =>
                setDraft({ ...draft, displayOrder: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <div className="sm:col-span-2">
            <span className="admin-label">Image du rayon</span>
            <ImageUpload
              value={draft.imageUrl}
              onChange={(url) => setDraft({ ...draft, imageUrl: url })}
              alt={draft.name}
              kind="categories"
            />
          </div>

          <label className="flex items-center gap-2 text-[13.5px] sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.isFeatured}
              onChange={(event) =>
                setDraft({ ...draft, isFeatured: event.target.checked })
              }
              className="accent-brand size-4"
            />
            Mise en avant sur l&apos;accueil
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
                  : "Creer la categorie"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette categorie ?"
        message={
          <>
            <strong>{deleting?.name}</strong> disparaitra de la navigation de la
            boutique.
          </>
        }
        detail={
          childrenCount > 0
            ? `Ses ${childrenCount} sous-rayon(s) seront detaches et deviendront des rayons principaux. Une categorie encore rattachee a des produits ne peut pas etre supprimee.`
            : "Une categorie encore rattachee a des produits ne peut pas etre supprimee : deplacez-les d'abord."
        }
        pending={deletePending}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={bulkConfirming}
        title={`Supprimer ${selected.length} categorie(s) ?`}
        message={
          allSelected ? (
            <>
              <strong>Toutes les categories</strong> ({categories.length})
              disparaitront de la navigation de la boutique.
            </>
          ) : (
            <>
              <strong>{selected.length} categorie(s)</strong> disparaitront de
              la navigation de la boutique.
            </>
          )
        }
        detail={
          <>
            {orphaned > 0
              ? `${orphaned} sous-rayon(s) non selectionne(s) seront detaches et deviendront des rayons principaux. `
              : null}
            Si une seule categorie est encore rattachee a des produits, rien
            n&apos;est supprime : deplacez ou supprimez d&apos;abord ces
            produits.
          </>
        }
        confirmLabel={`Supprimer ${selected.length} categorie(s)`}
        pending={bulkPending}
        error={bulkError}
        onConfirm={() => void onBulkDelete()}
        onCancel={() => setBulkConfirming(false)}
      />
    </div>
  );
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  // `indeterminate` n'existe qu'en propriete DOM, pas en attribut HTML.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 cursor-pointer"
      />
      Tout selectionner
    </label>
  );
}

function CategoryRow({
  category,
  checked,
  onToggle,
  onEdit,
  onRemove,
  onAddChild,
}: {
  category: Category;
  checked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onAddChild?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Selectionner ${category.name}`}
        className="size-4 shrink-0 cursor-pointer"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">
          {category.name}
          {category.isFeatured ? (
            <span className="bg-tint-warm text-tint-warm-ink ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold">
              Mise en avant
            </span>
          ) : null}
        </p>
        <p className="text-muted text-[12px]">
          /{category.slug} · ordre {category.displayOrder}
        </p>
      </div>

      <div className="flex gap-3 text-[12.5px] font-bold">
        {onAddChild ? (
          <button
            type="button"
            onClick={onAddChild}
            className="text-muted hover:text-brand"
          >
            + Sous-rayon
          </button>
        ) : null}
        <button
          type="button"
          onClick={onEdit}
          className="text-navy hover:text-brand"
        >
          Modifier
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-brand hover:underline"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
