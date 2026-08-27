"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  createCategory,
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

/**
 * Arborescence + edition sur la meme page : les categories sont peu nombreuses
 * et se manipulent les unes par rapport aux autres (ordre, parent, mise en
 * avant). Une page de liste et une page de formulaire separees feraient perdre
 * ce contexte a chaque aller-retour.
 */
export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roots = categories.filter((category) => !category.parentId);

  function startCreate(parentId = "") {
    setEditing("new");
    setDraft({ ...EMPTY, parentId });
    setError(null);
  }

  function startEdit(category: Category) {
    setEditing(category.id);
    setDraft(toDraft(category));
    setError(null);
  }

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);

    try {
      await action();
      setEditing(null);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Operation impossible",
      );
    } finally {
      setPending(false);
    }
  }

  function onRemove(category: Category) {
    if (
      !window.confirm(
        `Supprimer « ${category.name} » ? Une categorie encore rattachee a des produits ne peut pas etre supprimee.`,
      )
    ) {
      return;
    }

    void run(() => deleteCategory(category.id));
  }

  const form = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void run(() =>
          editing === "new"
            ? createCategory(toPayload(draft))
            : updateCategory(editing as string, toPayload(draft)),
        );
      }}
      className="bg-cream-deep border-line mt-3 grid gap-3 rounded-[12px] border p-4 sm:grid-cols-2"
    >
      <label className="block">
        <span className="admin-label">Nom *</span>
        <input
          required
          value={draft.name}
          onChange={(event) => {
            const name = event.target.value;
            setDraft((current) => ({
              ...current,
              name,
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
            .filter((root) => root.id !== editing)
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

      <label className="block sm:col-span-2">
        <span className="admin-label">Image (URL)</span>
        <input
          value={draft.imageUrl}
          onChange={(event) =>
            setDraft({ ...draft, imageUrl: event.target.value })
          }
          className="admin-input"
        />
      </label>

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

      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="admin-button">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="admin-button-ghost"
        >
          Annuler
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => startCreate()}
          className="admin-button"
        >
          Nouvelle categorie
        </button>
      </div>

      {editing === "new" ? <div className="admin-card mb-6">{form}</div> : null}

      <div className="space-y-3">
        {roots.map((root) => (
          <section key={root.id} className="admin-card">
            <CategoryRow
              category={root}
              onEdit={() => startEdit(root)}
              onRemove={() => onRemove(root)}
              onAddChild={() => startCreate(root.id)}
            />
            {editing === root.id ? form : null}

            {root.children.length > 0 ? (
              <ul className="border-line mt-3 space-y-2 border-t pt-3 pl-4">
                {root.children.map((child) => {
                  const full = categories.find((item) => item.id === child.id);
                  if (!full) return null;

                  return (
                    <li key={child.id}>
                      <CategoryRow
                        category={full}
                        onEdit={() => startEdit(full)}
                        onRemove={() => onRemove(full)}
                      />
                      {editing === child.id ? form : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  onEdit,
  onRemove,
  onAddChild,
}: {
  category: Category;
  onEdit: () => void;
  onRemove: () => void;
  onAddChild?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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
        <button type="button" onClick={onEdit} className="text-navy hover:text-brand">
          Modifier
        </button>
        <button type="button" onClick={onRemove} className="text-brand hover:underline">
          Supprimer
        </button>
      </div>
    </div>
  );
}
