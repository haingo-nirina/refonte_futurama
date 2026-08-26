import Link from "next/link";
import { discountLabel, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: Product }) {
  const discount = discountLabel(product);

  return (
    <Link
      href={`/produit/${product.id}`}
      className="border-line hover:border-brand group flex flex-col overflow-hidden rounded-2xl border bg-white transition hover:shadow-[0_12px_28px_-18px_rgba(20,20,40,0.4)]"
    >
      <div className="relative aspect-square">
        <ProductImage
          src={product.images[0]?.imageUrl}
          alt={product.name}
          className="h-full w-full"
        />
        {discount ? (
          <span className="bg-brand font-display absolute top-3 left-3 rounded-md px-2.5 py-1 text-xs font-bold text-white">
            {discount}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pt-4 pb-5">
        <span className="text-ink line-clamp-2 min-h-[2.7em] text-[14.5px] leading-snug font-medium">
          {product.name}
        </span>

        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-display text-navy text-[19px] font-extrabold tracking-tight">
            {formatPrice(product.promoPrice ?? product.price)}
          </span>
          {discount ? (
            <span className="text-muted-light text-[12.5px] line-through">
              {formatPrice(product.price)}
            </span>
          ) : null}
        </div>

        <span
          className={`text-xs font-medium ${product.stock > 0 ? "text-success" : "text-muted-light"}`}
        >
          {product.stock > 0
            ? `En stock · ${product.stock} piece${product.stock > 1 ? "s" : ""}`
            : "Rupture de stock"}
        </span>
      </div>
    </Link>
  );
}
