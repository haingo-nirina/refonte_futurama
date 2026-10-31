"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductImage } from "@/components/product-image";
import {
  ProductPicker,
  type PickedProduct,
} from "@/components/admin/product-picker";
import { ApiError } from "@/lib/api";
import { createLive, updateLive } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { fromLiveInputValue, toLiveInputValue } from "@/lib/live";
import type { AdminLiveDetail, LiveInput } from "@/lib/types";

/** Plafond du DTO backend (`ArrayMaxSize`). */
const MAX_PRODUCTS = 50;

/**
 * Le picker rend un `AdminProduct` complet : stock et etat de publication y
 * sont, et servent a prevenir la vendeuse avant le direct.
 */
type SelectedProduct = PickedProduct & { stock?: number; isActive?: boolean };

type Draft = {
  title: string;
  description: string;
  /** Valeur d'un `datetime-local`, en heure de Madagascar. */
  scheduledAt: string;
  /** Code d'integration ou lien de la video, facultatif. */
  facebookUrl: string;
  products: SelectedProduct[];
};

function toDraft(live?: AdminLiveDetail): Draft {
  if (!live) {
    return {
      title: "",
      description: "",
      scheduledAt: "",
      facebookUrl: "",
      products: [],
    };
  }

  return {
    title: live.title,
    description: live.description ?? "",
    scheduledAt: toLiveInputValue(live.scheduledAt),
    facebookUrl: live.facebookUrl ?? "",
    products: live.products.map((item) => item.product),
  };
}

/** Memes regles que les DTO backend, qui revalident de leur cote. */
function validate(draft: Draft): string | null {
  if (!draft.title.trim()) return "Le titre est obligatoire.";
  if (!draft.scheduledAt) return "La date et l'heure sont obligatoires.";

  return null;
}

/**
 * Le lien ne se prepare qu'avant le direct : pendant, il passe par « Changer
 * le lien » ; apres, par le bloc Replay. Hors de ce cas il n'est pas envoye,
 * sans quoi le backend refuserait l'enregistrement en direct.
 */
function canEditLink(live?: AdminLiveDetail): boolean {
  return !live || live.status === "PROGRAMME";
}

function toPayload(draft: Draft, withLink: boolean): LiveInput {
  return {
    title: draft.title.trim(),
    // Chaine vide -> `null` : le backend efface alors la valeur.
    description: draft.description.trim() || null,
    scheduledAt: fromLiveInputValue(draft.scheduledAt),
    ...(withLink ? { facebookUrl: draft.facebookUrl.trim() || null } : {}),
    productIds: draft.products.map((product) => product.id),
  };
}

/**
 * Creation et edition d'un live. Page plutot que modale : la selection de
 * produits s'allonge, et elle se prepare au calme, avant le direct.
 *
 * La selection s'edite en liste locale complete et ne part qu'a
 * l'enregistrement : le backend la remplace en bloc, comme la galerie d'un
 * produit.
 */
export function LiveForm({ live }: { live?: AdminLiveDetail }) {
  const router = useRouter();

  const [draft, setDraft] = useState<Draft>(() => toDraft(live));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addProduct(product: PickedProduct | null) {
    if (!product) return;
    if (draft.products.some((item) => item.id === product.id)) return;

    set("products", [...draft.products, product as SelectedProduct]);
  }

  function moveProduct(index: number, offset: -1 | 1) {
    const next = [...draft.products];
    const [moved] = next.splice(index, 1);
    next.splice(index + offset, 0, moved);
    set("products", next);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const invalid = validate(draft);
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(true);
    setError(null);
    try {
      if (live) {
        await updateLive(live.id, toPayload(draft, canEditLink(live)));
        setSaved(true);
        router.refresh();
      } else {
        await createLive(toPayload(draft, true));
        router.push("/admin/lives");
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Enregistrement impossible",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="admin-card grid content-start gap-4">
        <h2 className="font-display text-navy text-[15px] font-extrabold">
          Annonce
        </h2>

        <label className="block">
          <span className="admin-label">Titre</span>
          <input
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            maxLength={150}
            placeholder="Spécial cuisine : les nouveautés Moulinex"
            className="admin-input"
            required
          />
        </label>

        <label className="block">
          <span className="admin-label">Description (facultatif)</span>
          <textarea
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={2000}
            rows={4}
            className="admin-input"
          />
        </label>

        {canEditLink(live) ? (
          <label className="block">
            <span className="admin-label">
              Lien du live Facebook (facultatif)
            </span>
            {/* pas de type="url" : le code d'integration est du HTML, le
                backend en extrait le lien */}
            <textarea
              value={draft.facebookUrl}
              onChange={(event) => set("facebookUrl", event.target.value)}
              placeholder='<iframe src="https://www.facebook.com/plugins/video.php?…'
              rows={2}
              className="admin-input font-mono text-[12px]"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-muted-light mt-1 block text-[11.5px]">
              Si le live est déjà programmé sur Facebook : collez le code de «
              Intégrer à un site » de sa publication. Il sera pré-rempli au
              moment de « Lancer le live ». Rien ne s&apos;affiche sur le site
              avant le lancement.
            </span>
          </label>
        ) : null}

        <label className="block">
          <span className="admin-label">Date et heure prévues</span>
          <input
            type="datetime-local"
            value={draft.scheduledAt}
            onChange={(event) => set("scheduledAt", event.target.value)}
            className="admin-input"
            required
          />
          <span className="text-muted-light mt-1 block text-[11.5px]">
            Heure de Madagascar. Le jour venu, lancez la diffusion sur la page
            Facebook puis « Lancer le live » ici.
          </span>
        </label>

      </section>

      <section className="admin-card grid content-start gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-navy text-[15px] font-extrabold">
            Produits présentés
          </h2>
          <span className="text-muted text-[12px]">
            {draft.products.length} / {MAX_PRODUCTS}
          </span>
        </div>

        {draft.products.length === 0 ? (
          <p className="text-muted bg-cream-deep rounded-[10px] px-3 py-4 text-center text-[13px]">
            Aucun produit. Recherchez-les ci-dessous, dans l&apos;ordre où vous
            les présenterez.
          </p>
        ) : (
          <ol className="grid gap-2">
            {draft.products.map((product, index) => (
              <li
                key={product.id}
                className="border-line flex items-center gap-3 rounded-[10px] border bg-white p-2"
              >
                <span className="text-muted-light w-5 shrink-0 text-center text-[12px] font-bold">
                  {index + 1}
                </span>
                <ProductImage
                  src={product.images?.[0]?.imageUrl}
                  alt={product.name}
                  className="border-line size-11 shrink-0 rounded-[8px] border !text-base"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">
                    {product.name}
                  </span>
                  <span className="text-muted block text-[11.5px]">
                    {formatPrice(product.price)}
                    {product.isActive === false ? (
                      <span className="text-brand font-semibold">
                        {" "}
                        · hors ligne, masqué sur la page live
                      </span>
                    ) : product.stock === 0 ? (
                      <span className="text-brand font-semibold">
                        {" "}
                        · en rupture
                      </span>
                    ) : null}
                  </span>
                </span>

                <span className="flex shrink-0 items-center">
                  <IconButton
                    label="Monter"
                    onClick={() => moveProduct(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label="Descendre"
                    onClick={() => moveProduct(index, 1)}
                    disabled={index === draft.products.length - 1}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    label="Retirer"
                    onClick={() =>
                      set(
                        "products",
                        draft.products.filter((item) => item.id !== product.id),
                      )
                    }
                  >
                    ×
                  </IconButton>
                </span>
              </li>
            ))}
          </ol>
        )}

        {draft.products.length < MAX_PRODUCTS ? (
          <div>
            <span className="admin-label">Ajouter un produit</span>
            {/* `selected` toujours vide : le picker sert de champ d'ajout et
                se vide apres chaque choix. */}
            <ProductPicker selected={null} onSelect={addProduct} />
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-2">
        {error ? <p className="text-brand mr-auto text-[13px]">{error}</p> : null}
        {saved ? (
          <p className="text-success mr-auto text-[13px] font-semibold">
            Modifications enregistrées.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/admin/lives")}
          disabled={pending}
          className="admin-button-ghost"
        >
          Retour
        </button>
        <button type="submit" disabled={pending} className="admin-button">
          {pending
            ? "Enregistrement…"
            : live
              ? "Enregistrer"
              : "Programmer le live"}
        </button>
      </div>
    </form>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="text-muted hover:bg-cream-deep hover:text-brand flex size-9 items-center justify-center rounded-[8px] text-[16px] font-bold transition disabled:opacity-30"
    >
      {children}
    </button>
  );
}
