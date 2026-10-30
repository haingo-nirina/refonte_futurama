import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductThumbnail } from "@/components/product-thumbnail";
import { discountLabel, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * Variante de `ProductCard` pour la page live : aucun lien ne quitte la page,
 * la video doit continuer. La fiche complete s'ouvre dans un nouvel onglet.
 */
export function LiveProductCard({ product }: { product: Product }) {
  const discount = discountLabel(product);

  return (
    <article className="border-line flex h-full flex-col gap-2 rounded-[12px] border bg-white p-2.5">
      <div className="bg-cream-deep relative aspect-square overflow-hidden rounded-[9px]">
        <ProductThumbnail images={product.images} alt={product.name} />
        {discount ? (
          <span className="bg-brand font-display absolute top-2 left-2 z-[2] rounded-md px-2 py-1 text-[11px] font-bold text-white">
            {discount}
          </span>
        ) : null}
      </div>

      <h3 className="text-ink line-clamp-2 min-h-[34px] text-[12.5px] leading-[1.35]">
        {product.name}
      </h3>

      <div className="flex flex-wrap items-baseline gap-[7px]">
        <span className="font-display text-navy text-[17px] font-extrabold tracking-tight">
          {formatPrice(product.activePromotion?.discountedPrice ?? product.price)}
        </span>
        {discount ? (
          <span className="text-muted-light text-[11px] line-through">
            {formatPrice(product.price)}
          </span>
        ) : null}
      </div>

      <span
        className={`text-[10.5px] ${product.stock > 0 ? "text-success" : "text-muted-light"}`}
      >
        {product.stock > 0
          ? `En stock · ${product.stock} pièce${product.stock > 1 ? "s" : ""}`
          : "Rupture de stock"}
      </span>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <AddToCartButton productId={product.id} stock={product.stock} />
        <div className="flex items-center justify-end gap-2 text-[11.5px] font-semibold">
          <a
            href={`/produit/${product.id}`}
            target="_blank"
            rel="noopener"
            className="text-muted hover:text-brand"
          >
            Détails ↗
          </a>
        </div>
      </div>
    </article>
  );
}
