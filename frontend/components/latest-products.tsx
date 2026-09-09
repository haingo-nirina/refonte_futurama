import Link from "next/link";
import { formatPrice, formatRelativeDate } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ProductImage } from "./product-image";

/**
 * La section « Derniers produits » de l'accueil.
 *
 * Purement presentationnelle, comme `PromotionOfMonth` : la selection arrive
 * deja triee et filtree par le backend (`GET /products` trie par date de
 * creation decroissante et masque les produits depublies), le fetch reste
 * dans la page.
 *
 * La pastille « Nouveau » est portee par **toutes** les cartes : la section
 * n'affiche que la tete du catalogue triee par `createdAt`, ces produits sont
 * par construction les derniers ajoutes. La date de mise en ligne est donnee
 * en relatif a cote du rayon, ce qui evite d'avoir a defendre une fenetre en
 * jours arbitraire.
 *
 * Composant serveur : `formatRelativeDate` depend de l'heure courante, un
 * composant client rejouerait un texte different du HTML serveur.
 *
 * Elle ne rend rien tant qu'aucun produit n'est publie.
 */
export function LatestProducts({
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
          <span className="text-tint-cool-accent font-mono text-[10.5px] tracking-[0.18em]">
            NOUVEAUTES
          </span>
          <h2 className="font-display text-navy mt-2 text-[32px] font-extrabold tracking-tight">
            Derniers produits
          </h2>
        </div>
        <Link href={href} className="text-brand text-[13.5px] font-bold">
          Tout voir →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <LatestProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function LatestProductCard({ product }: { product: Product }) {
  // Une nouveaute peut deja porter une promotion : le prix affiche reste celui
  // que le backend a calcule, jamais un recalcul local.
  const promotedPrice = product.activePromotion?.discountedPrice;

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
        <span className="bg-tint-cool-accent font-display absolute top-3 left-3 rounded-md px-[9px] py-[5px] text-xs font-bold text-white">
          Nouveau
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-[7px] px-[18px] pt-4 pb-[18px]">
        <span className="text-muted-light font-mono text-[10px] tracking-[0.12em] uppercase">
          {product.category ? `${product.category.name} · ` : null}
          {formatRelativeDate(product.createdAt)}
        </span>
        <span className="text-ink line-clamp-2 text-[14.5px] leading-[1.35] font-medium text-pretty">
          {product.name}
        </span>

        <div className="mt-auto flex flex-wrap items-baseline gap-[9px] pt-2.5">
          <span className="font-display text-navy text-[19px] font-extrabold tracking-tight">
            {formatPrice(promotedPrice ?? product.price)}
          </span>
          {promotedPrice ? (
            <span className="text-muted-light text-[12.5px] line-through">
              {formatPrice(product.price)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
