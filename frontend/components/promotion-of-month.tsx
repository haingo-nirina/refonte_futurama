import Link from "next/link";
import { formatPrice, promotionDiscountLabel } from "@/lib/format";
import type { Promotion } from "@/lib/types";
import { ProductImage } from "./product-image";

/**
 * La section « Promotion du mois » de l'accueil.
 *
 * Purement presentationnelle : les promotions arrivent deja filtrees par le
 * backend (marquees, actives, dans leur fenetre, produit publie). Le fetch
 * reste dans la page, comme partout ailleurs.
 *
 * Elle ne rend **rien** quand la selection est vide : une section « Offres
 * limitees » sans offre est pire que pas de section du tout.
 */
export function PromotionOfMonth({
  promotions,
  href,
}: {
  promotions: Promotion[];
  href: string;
}) {
  if (promotions.length === 0) return null;

  // Le titre porte par les promotions ("Promotion du mois - Septembre 2026")
  // prime sur l'intitule en dur des qu'il est renseigne, et il est commun a la
  // selection : c'est la meme operation commerciale.
  const title = promotions.find((promotion) => promotion.titre)?.titre;

  return (
    <section className="px-4 pt-14 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-brand font-mono text-[10.5px] tracking-[0.18em]">
            OFFRES LIMITEES
          </span>
          <h2 className="font-display text-navy mt-2 text-[32px] font-extrabold tracking-tight">
            {title ?? "Promotion du mois"}
          </h2>
        </div>
        <Link href={href} className="text-brand text-[13.5px] font-bold">
          Tout voir →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {promotions.map((promotion) => (
          <PromotionCard key={promotion.id} promotion={promotion} />
        ))}
      </div>
    </section>
  );
}

function PromotionCard({ promotion }: { promotion: Promotion }) {
  const { product } = promotion;

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
        <span className="bg-brand font-display absolute top-3 left-3 rounded-md px-[9px] py-[5px] text-xs font-bold text-white">
          {promotionDiscountLabel(promotion.discountPercent)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-[7px] px-[18px] pt-4 pb-[18px]">
        <span className="text-muted-light font-mono text-[10px] tracking-[0.12em] uppercase">
          {product.category.name}
        </span>
        <span className="text-ink line-clamp-2 text-[14.5px] leading-[1.35] font-medium text-pretty">
          {product.name}
        </span>

        <div className="mt-auto flex flex-wrap items-baseline gap-[9px] pt-2.5">
          <span className="font-display text-navy text-[19px] font-extrabold tracking-tight">
            {formatPrice(promotion.discountedPrice)}
          </span>
          <span className="text-muted-light text-[12.5px] line-through">
            {formatPrice(promotion.basePrice)}
          </span>
        </div>
      </div>
    </Link>
  );
}
