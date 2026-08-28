"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/admin/image-upload";
import { ApiError } from "@/lib/api";
import {
  replaceProductImages,
  replaceProductRelations,
  replaceProductSpecs,
} from "@/lib/admin-api";
import {
  RELATION_TYPES,
  type AdminProduct,
  type ProductImage,
  type ProductRelation,
  type ProductSpec,
  type RelationType,
} from "@/lib/types";

/**
 * Galerie, caracteristiques et produits lies s'envoient en bloc : le backend
 * remplace la collection entiere a chaque `PUT`. On edite donc une liste
 * locale complete, et on ne sauvegarde qu'a la validation — pas ligne par
 * ligne, ce qui multiplierait les allers-retours pour rien.
 */

// ------------------------------------------------------------------- Galerie

export function ImagesEditor({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const [rows, setRows] = useState(() =>
    images.map((image) => ({
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary,
    })),
  );

  const { save, pending, error, saved } = useSave(() =>
    replaceProductImages(productId, rows),
  );

  return (
    <Section
      title="Galerie"
      hint="Cliquez une vignette pour televerser une photo. La premiere image, ou celle marquee principale, est celle que voit le client sur le catalogue."
      onSave={save}
      pending={pending}
      error={error}
      saved={saved}
      onAdd={() => setRows([...rows, { imageUrl: "", isPrimary: false }])}
      addLabel="Ajouter une image"
    >
      {rows.map((row, index) => (
        <Row key={index} onRemove={() => setRows(rows.toSpliced(index, 1))}>
          {/* Cliquer la vignette ouvre le selecteur de fichier. */}
          <ImageUpload
            compact
            value={row.imageUrl}
            alt={`Visuel ${index + 1}`}
            onChange={(url) =>
              setRows(rows.with(index, { ...row, imageUrl: url }))
            }
          />

          {/* Le champ texte reste : il accepte un chemin deja en place (ceux
              du seed) ou une URL externe, sans passer par un televersement. */}
          <input
            value={row.imageUrl}
            placeholder="Cliquez la vignette pour televerser, ou collez une URL"
            onChange={(event) =>
              setRows(
                rows.with(index, { ...row, imageUrl: event.target.value }),
              )
            }
            className="admin-input min-w-[180px] flex-1"
          />

          <label className="flex shrink-0 items-center gap-2 text-[12.5px]">
            <input
              type="radio"
              name="primary-image"
              checked={row.isPrimary}
              onChange={() =>
                // Une seule principale : le backend refuse les doublons.
                setRows(
                  rows.map((entry, position) => ({
                    ...entry,
                    isPrimary: position === index,
                  })),
                )
              }
              className="accent-brand size-4"
            />
            Principale
          </label>
        </Row>
      ))}
    </Section>
  );
}

// ----------------------------------------------------------- Caracteristiques

export function SpecsEditor({
  productId,
  specs,
}: {
  productId: string;
  specs: ProductSpec[];
}) {
  const [rows, setRows] = useState(() =>
    specs.map((spec) => ({ label: spec.label, value: spec.value })),
  );

  const { save, pending, error, saved } = useSave(() =>
    replaceProductSpecs(productId, rows),
  );

  return (
    <Section
      title="Caracteristiques"
      hint="Affichees dans l'ordre de cette liste sur la fiche produit."
      onSave={save}
      pending={pending}
      error={error}
      saved={saved}
      onAdd={() => setRows([...rows, { label: "", value: "" }])}
      addLabel="Ajouter une ligne"
    >
      {rows.map((row, index) => (
        <Row key={index} onRemove={() => setRows(rows.toSpliced(index, 1))}>
          <input
            value={row.label}
            placeholder="Garantie"
            onChange={(event) =>
              setRows(rows.with(index, { ...row, label: event.target.value }))
            }
            className="admin-input flex-1"
          />
          <input
            value={row.value}
            placeholder="2 ans"
            onChange={(event) =>
              setRows(rows.with(index, { ...row, value: event.target.value }))
            }
            className="admin-input flex-1"
          />
        </Row>
      ))}
    </Section>
  );
}

// ------------------------------------------------------------ Produits lies

export function RelationsEditor({
  productId,
  relations,
  products,
}: {
  productId: string;
  relations: ProductRelation[];
  products: AdminProduct[];
}) {
  const [rows, setRows] = useState(() =>
    relations.map((relation) => ({
      relatedProductId: relation.relatedProductId,
      relationType: relation.relationType,
    })),
  );

  const { save, pending, error, saved } = useSave(() =>
    replaceProductRelations(
      productId,
      rows.filter((row) => row.relatedProductId),
    ),
  );

  // Un produit ne peut pas etre lie a lui-meme (400 cote backend).
  const choices = products.filter((product) => product.id !== productId);

  return (
    <Section
      title="Produits lies"
      hint="« Similaire » est pose dans les deux sens ; « souvent achete ensemble » reste a sens unique."
      onSave={save}
      pending={pending}
      error={error}
      saved={saved}
      onAdd={() =>
        setRows([...rows, { relatedProductId: "", relationType: "similar" }])
      }
      addLabel="Ajouter un lien"
    >
      {rows.map((row, index) => (
        <Row key={index} onRemove={() => setRows(rows.toSpliced(index, 1))}>
          <select
            value={row.relatedProductId}
            onChange={(event) =>
              setRows(
                rows.with(index, {
                  ...row,
                  relatedProductId: event.target.value,
                }),
              )
            }
            className="admin-input flex-1"
          >
            <option value="">— choisir un produit —</option>
            {choices.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <select
            value={row.relationType}
            onChange={(event) =>
              setRows(
                rows.with(index, {
                  ...row,
                  relationType: event.target.value as RelationType,
                }),
              )
            }
            className="admin-input flex-1"
          >
            {RELATION_TYPES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </Row>
      ))}
    </Section>
  );
}

// ------------------------------------------------------------------ Communs

function useSave(action: () => Promise<unknown>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);

    try {
      await action();
      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Enregistrement impossible",
      );
    } finally {
      setPending(false);
    }
  }

  return { save, pending, error, saved };
}

function Section({
  title,
  hint,
  children,
  onAdd,
  addLabel,
  onSave,
  pending,
  error,
  saved,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  onAdd: () => void;
  addLabel: string;
  onSave: () => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
}) {
  return (
    <section className="admin-card">
      <header className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-display text-navy text-[15px] font-extrabold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="text-brand text-[12.5px] font-bold hover:underline"
        >
          + {addLabel}
        </button>
      </header>
      <p className="text-muted-light mb-4 text-[12px]">{hint}</p>

      <div className="space-y-2">{children}</div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="admin-button"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {error ? <span className="text-brand text-[12.5px]">{error}</span> : null}
        {saved && !error ? (
          <span className="text-success text-[12.5px]">Enregistre.</span>
        ) : null}
      </div>
    </section>
  );
}

function Row({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Retirer"
        className="border-line-strong text-muted hover:border-brand hover:text-brand flex size-[42px] shrink-0 items-center justify-center rounded-[10px] border bg-white transition"
      >
        ×
      </button>
    </div>
  );
}
