import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import {
  ImagesEditor,
  RelationsEditor,
  SpecsEditor,
} from "@/components/admin/product-collections";
import {
  PromotionStatusBadge,
  promotionState,
} from "@/components/admin/status-badge";
import {
  ApiError,
  getActivePromotion,
  getCategories,
  getMarques,
} from "@/lib/api";
import { getAdminProduct, getAdminProducts } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata = { title: "Edition produit" };

/** Plafond du DTO backend : de quoi alimenter le selecteur de produits lies. */
const RELATION_CHOICES_LIMIT = 100;

export default async function EditProductPage({
  params,
}: PageProps<"/admin/produits/[id]">) {
  const { id } = await params;
  const token = await getServerToken();

  const product = await getAdminProduct(id, token).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  const [categories, marques, choices, promotion] = await Promise.all([
    getCategories(),
    getMarques(),
    getAdminProducts({ limit: RELATION_CHOICES_LIMIT }, token),
    getActivePromotion(product.id),
  ]);

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/produits"
        className="text-muted hover:text-brand text-[12.5px]"
      >
        ← Tous les produits
      </Link>

      <header className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-navy text-2xl font-extrabold">
            {product.name}
          </h1>
          <p className="text-muted mt-1 text-sm">
            {product.viewsCount} vue(s) · cree le{" "}
            {formatDate(product.createdAt)} · modifie le{" "}
            {formatDate(product.updatedAt)}
          </p>
        </div>

        <Link
          href={`/produit/${product.id}`}
          className="admin-button-ghost"
          target="_blank"
        >
          Voir sur la boutique
        </Link>
      </header>

      <div className="space-y-6">
        <ProductForm
          categories={categories}
          marques={marques}
          product={product}
        />

        {/* Lecture seule : le prix promo n'a plus de champ de saisie, il vient
            entierement de la table `promotions`. Modifier se fait la-bas. */}
        <section className="admin-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-navy text-[15px] font-extrabold">
              Promotion en cours
            </h2>
            <Link
              href="/admin/promotions"
              className="text-brand text-[12.5px] font-bold hover:underline"
            >
              Gerer les promotions →
            </Link>
          </div>

          {promotion ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
              <span className="font-display text-navy text-[19px] font-extrabold">
                {formatPrice(promotion.discountedPrice)}
                <span className="text-muted-light ml-2 text-[12.5px] font-normal line-through">
                  {formatPrice(promotion.basePrice)}
                </span>
              </span>
              <span className="font-semibold">
                -{promotion.discountPercent} %
              </span>
              <span className="text-muted">
                {formatDate(promotion.startDate)} →{" "}
                {formatDate(promotion.endDate)}
              </span>
              <PromotionStatusBadge state={promotionState(promotion)} />
            </div>
          ) : (
            <p className="text-muted-light text-[13px]">
              Aucune promotion active sur ce produit.
            </p>
          )}
        </section>

        <ImagesEditor productId={product.id} images={product.images} />
        <SpecsEditor productId={product.id} specs={product.specs} />
        <RelationsEditor
          productId={product.id}
          relations={product.relationsFrom}
          products={choices.data}
        />

        <section className="admin-card">
          <h2 className="font-display text-navy mb-4 text-[15px] font-extrabold">
            Avis ({product.reviews.length})
          </h2>

          {product.reviews.length === 0 ? (
            <p className="text-muted-light text-[13px]">
              Aucun avis sur ce produit.
            </p>
          ) : (
            <ul className="divide-line divide-y">
              {product.reviews.map((review) => (
                <li key={review.id} className="flex gap-4 py-3">
                  <span className="font-display text-navy shrink-0 font-extrabold">
                    {review.rating}/5
                  </span>
                  <p className="text-muted min-w-0 flex-1 text-[13px]">
                    {review.comment ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/admin/avis?productId=${product.id}`}
            className="text-brand mt-4 inline-block text-[12.5px] font-bold hover:underline"
          >
            Voir tous les avis de ce produit →
          </Link>
        </section>
      </div>
    </div>
  );
}
