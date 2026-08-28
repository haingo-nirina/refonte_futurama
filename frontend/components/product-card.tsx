import Link from "next/link";
import { discountLabel, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductThumbnail } from "./product-thumbnail";

export function ProductCard({ product }: { product: Product }) {
  const discount = discountLabel(product);

  return (
    <article className="group flex flex-col gap-[7px]">
      <div className="bg-cream-deep relative aspect-square overflow-hidden rounded-[10px]">
        <ProductThumbnail images={product.images} alt={product.name} />

        {/* Le lien couvre le visuel plutot que de l'englober : les pastilles
            de la vignette sont des boutons, ils ne peuvent pas vivre dans un
            `<a>`. */}
        <Link
          href={`/produit/${product.id}`}
          aria-label={product.name}
          className="absolute inset-0 z-[1]"
        />

        {discount ? (
          <span className="bg-brand font-display absolute top-2.5 left-2.5 z-[2] rounded-md px-2 py-1 text-[11px] font-bold text-white">
            {discount}
          </span>
        ) : null}
      </div>

      <Link
        href={`/produit/${product.id}`}
        className="text-ink group-hover:text-brand line-clamp-2 min-h-[34px] text-[12.5px] leading-[1.35] transition"
      >
        {product.name}
      </Link>

      {product.marque ? (
        <span className="bg-line text-muted self-start rounded-md px-2.5 py-[3px] text-[10.5px]">
          {product.marque.name}
        </span>
      ) : null}

      <div className="flex flex-wrap items-baseline gap-[7px]">
        <span className="font-display text-navy text-[18px] font-extrabold tracking-tight">
          {formatPrice(product.promoPrice ?? product.price)}
        </span>
        {discount ? (
          <span className="text-muted-light text-[11px] line-through">
            {formatPrice(product.price)}
          </span>
        ) : null}
      </div>

      <span
        className={`text-[10.5px] leading-[1.3] ${product.stock > 0 ? "text-success" : "text-muted-light"}`}
      >
        {product.stock > 0
          ? `En stock · ${product.stock} piece${product.stock > 1 ? "s" : ""}`
          : "Rupture de stock"}
      </span>

      <div className="mt-0.5">
        <AddToCartButton productId={product.id} stock={product.stock} />
      </div>
    </article>
  );
}
