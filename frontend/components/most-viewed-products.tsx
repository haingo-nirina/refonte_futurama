import Link from "next/link";
import { discountLabel, formatPrice, formatViews } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ProductImage } from "./product-image";

/**
 * La section « Le plus consulte » de l'accueil.
 *
 * Purement presentationnelle, comme `PromotionOfMonth` et `LatestProducts` :
 * le classement vient du backend, qui trie sur `viewsCount` et ne renvoie que
 * des produits publies.
 *
 * `viewsCount` est incremente a chaque ouverture de fiche par un visiteur (une
 * consultation depuis le backoffice n'en est pas une) : le classement se forme
 * donc avec le trafic reel. Sur une base fraiche tous les compteurs valent 0 —
 * la section retombe alors sur les produits les plus recents et le compteur de
 * vues n'est pas affiche, plutot que d'annoncer « 0 vue ».
 *
 * Elle ne rend rien tant qu'aucun produit n'est publie.
 */
export function MostViewedProducts({
  products,
  href,
}: {
  products: Product[];
  href: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="px-4 pt-14 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-brand font-mono text-[10.5px] tracking-[0.18em]">
            TENDANCE
          </span>
          <h2 className="font-display text-navy mt-2 text-[32px] font-extrabold tracking-tight">
            Le plus consulte
          </h2>
        </div>
        <Link href={href} className="text-brand text-[13.5px] font-bold">
          Tout voir →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <MostViewedCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function MostViewedCard({ product }: { product: Product }) {
  // Le prix reduit est celui que le backend a calcule : ne jamais le
  // recalculer ici, les arrondis divergeraient.
  const discount = discountLabel(product);

  return (
    <Link
      href={`/produit/${product.id}`}
      className="border-line hover:border-brand group flex flex-col overflow-hidden rounded-[14px] border bg-white transition hover:shadow-[0_12px_28px_-18px_rgba(20,20,40,0.4)]"
    >
      <div className="bg-cream-deep relative aspect-square">
        <ProductImage
          src={product.images[0]?.imageUrl}
          alt={product.name}
          className="h-full w-full"
        />
        {discount ? (
          <span className="bg-brand font-display absolute top-3 left-3 rounded-md px-[9px] py-[5px] text-xs font-bold text-white">
            {discount}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-[7px] px-[18px] pt-4 pb-[18px]">
        {product.category ? (
          <span className="text-muted-light font-mono text-[10px] tracking-[0.12em] uppercase">
            {product.category.name}
          </span>
        ) : null}
        <span className="text-ink line-clamp-2 text-[14.5px] leading-[1.35] font-medium text-pretty">
          {product.name}
        </span>

        {product.viewsCount > 0 ? (
          <span className="text-muted flex items-center gap-1.5 text-[12px]">
            <EyeIcon />
            {formatViews(product.viewsCount)}
          </span>
        ) : null}

        <div className="mt-auto flex flex-wrap items-baseline gap-[9px] pt-2.5">
          <span className="font-display text-navy text-[19px] font-extrabold tracking-tight">
            {formatPrice(
              product.activePromotion?.discountedPrice ?? product.price,
            )}
          </span>
          {discount ? (
            <span className="text-muted-light text-[12.5px] line-through">
              {formatPrice(product.price)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/** L'oeil de la maquette, en SVG : l'emoji ne suit pas la couleur du texte. */
function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[13px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
