"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { createProduct, deleteProduct, updateProduct } from "@/lib/admin-api";
import type { AdminProduct, Category, ProductInput } from "@/lib/types";

/** `name` -> `slug` : meme regle que la contrainte du DTO backend. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type FormState = {
  categoryId: string;
  name: string;
  slug: string;
  reference: string;
  description: string;
  price: string;
  promoPrice: string;
  stock: string;
  isPremium: boolean;
  isActive: boolean;
  videoUrl: string;
};

function initialState(product?: AdminProduct): FormState {
  return {
    categoryId: product?.categoryId ?? "",
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    reference: product?.reference ?? "",
    description: product?.description ?? "",
    price: product?.price ?? "",
    promoPrice: product?.promoPrice ?? "",
    stock: String(product?.stock ?? 0),
    isPremium: product?.isPremium ?? false,
    isActive: product?.isActive ?? true,
    videoUrl: product?.videoUrl ?? "",
  };
}

/**
 * Creation et edition partagent ce formulaire : les champs sont les memes, et
 * seul l'appel differe. Le vendeur n'y figure pas — l'API n'expose aucune
 * route pour lister les vendeurs, et ne pas envoyer `vendorId` laisse la
 * valeur existante intacte.
 */
export function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: AdminProduct;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(product));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function toPayload(): ProductInput {
    return {
      categoryId: form.categoryId,
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      // Chaine vide refusee par les @IsNotEmpty du DTO : on omet plutot.
      reference: form.reference.trim() || undefined,
      description: form.description.trim() || undefined,
      price: Number(form.price),
      promoPrice: form.promoPrice.trim() ? Number(form.promoPrice) : undefined,
      stock: Number(form.stock) || 0,
      isPremium: form.isPremium,
      isActive: form.isActive,
      videoUrl: form.videoUrl.trim() || undefined,
    };
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    try {
      if (product) {
        await updateProduct(product.id, toPayload());
        setSaved(true);
        router.refresh();
      } else {
        const created = await createProduct(toPayload());
        // Galerie, specs et relations ont besoin d'un id : on enchaine sur
        // la fiche d'edition plutot que de renvoyer a la liste.
        router.push(`/admin/produits/${created.id}`);
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Enregistrement impossible",
      );
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!product) return;
    if (
      !window.confirm(
        `Supprimer definitivement « ${product.name} » ? Les commandes passees gardent son nom et son prix.`,
      )
    ) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await deleteProduct(product.id);
      router.push("/admin/produits");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Suppression impossible",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="admin-card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="admin-label">Nom *</span>
          <input
            required
            value={form.name}
            onChange={(event) => {
              const name = event.target.value;
              setForm((current) => ({
                ...current,
                name,
                // Le slug suit le nom tant qu'il n'a pas ete touche a la main.
                slug:
                  current.slug === slugify(current.name) || current.slug === ""
                    ? slugify(name)
                    : current.slug,
              }));
              setSaved(false);
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
            value={form.slug}
            onChange={(event) => set("slug", event.target.value)}
            className="admin-input"
          />
        </label>

        <label className="block">
          <span className="admin-label">Categorie *</span>
          <select
            required
            value={form.categoryId}
            onChange={(event) => set("categoryId", event.target.value)}
            className="admin-input"
          >
            <option value="">— choisir —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parent
                  ? `${category.parent.name} › ${category.name}`
                  : category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="admin-label">Reference</span>
          <input
            value={form.reference}
            onChange={(event) => set("reference", event.target.value)}
            className="admin-input"
          />
        </label>

        <label className="block">
          <span className="admin-label">Stock</span>
          <input
            type="number"
            min={0}
            value={form.stock}
            onChange={(event) => set("stock", event.target.value)}
            className="admin-input"
          />
        </label>

        <label className="block">
          <span className="admin-label">Prix (Ar) *</span>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(event) => set("price", event.target.value)}
            className="admin-input"
          />
        </label>

        <label className="block">
          <span className="admin-label">Prix promo (Ar)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.promoPrice}
            onChange={(event) => set("promoPrice", event.target.value)}
            className="admin-input"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="admin-label">Video (URL)</span>
          <input
            type="url"
            value={form.videoUrl}
            onChange={(event) => set("videoUrl", event.target.value)}
            className="admin-input"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="admin-label">Description</span>
          <textarea
            rows={5}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            className="admin-input"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-5 text-[13.5px]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
            className="accent-brand size-4"
          />
          En ligne
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isPremium}
            onChange={(event) => set("isPremium", event.target.checked)}
            className="accent-brand size-4"
          />
          Produit premium
        </label>
      </div>

      {error ? <p className="text-brand text-[13px]">{error}</p> : null}
      {saved && !error ? (
        <p className="text-success text-[13px]">Produit enregistre.</p>
      ) : null}

      <div className="border-line flex flex-wrap items-center gap-3 border-t pt-4">
        <button type="submit" disabled={pending} className="admin-button">
          {pending
            ? "Enregistrement…"
            : product
              ? "Enregistrer"
              : "Creer le produit"}
        </button>

        <Link href="/admin/produits" className="admin-button-ghost">
          Annuler
        </Link>

        {product ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-brand ml-auto text-[13px] font-bold hover:underline disabled:opacity-50"
          >
            Supprimer
          </button>
        ) : null}
      </div>
    </form>
  );
}
