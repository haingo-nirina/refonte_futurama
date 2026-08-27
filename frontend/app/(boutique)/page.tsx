import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { getCategories } from "@/lib/api";
import { ALL_CATEGORIES_SLUG } from "@/lib/catalogue";
import type { Category } from "@/lib/types";

const TRUST = [
  {
    title: "Importateur direct",
    desc: "Pas d'intermediaire, prix d'importation.",
  },
  { title: "Stock a Tsaralalana", desc: "Retrait gratuit en boutique." },
  { title: "Livraison Antananarivo", desc: "Offerte des 300 000 Ar." },
  { title: "Paiement flexible", desc: "Mvola, Orange Money, a la livraison." },
];

/**
 * Les deux cartes qui flanquent le hero (colonne de droite de la maquette)
 * alternent un aplat froid et un aplat chaud. Les tokens vivent dans
 * `app/globals.css`.
 */
const HERO_TINTS = [
  {
    card: "bg-tint-cool",
    eyebrow: "text-tint-cool-accent",
    title: "text-tint-cool-ink",
    link: "text-tint-cool-accent",
  },
  {
    card: "bg-tint-warm",
    eyebrow: "text-tint-warm-accent",
    title: "text-tint-warm-ink",
    link: "text-tint-warm-accent",
  },
];

export default async function HomePage() {
  const categories = await getCategories();
  const topLevel = categories.filter((category) => category.parentId === null);
  const featured = topLevel.filter((category) => category.isFeatured);

  // Les deux premiers rayons mis en avant flanquent le hero, comme la colonne
  // de droite de la maquette. C'est cette paire qui tient desormais le role de
  // mise en avant : la grille qui suit reste la liste complete des rayons.
  const heroSide = (featured.length > 0 ? featured : topLevel).slice(0, 2);

  return (
    <div>
      <section className="px-4 pt-10 sm:px-8 lg:px-12">
        <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <div className="from-navy to-navy-deep relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[18px] bg-gradient-to-br px-8 py-12 sm:px-11 sm:py-11">
            <span className="text-brand/90 font-mono text-[11px] tracking-[0.2em]">
              IMPORTATEUR DIRECT · MADAGASCAR
            </span>
            <h1 className="font-display mt-3.5 max-w-[15ch] text-4xl leading-[1.02] font-extrabold tracking-tight text-white lg:text-[52px]">
              Le bonheur de vos clients, importe en direct.
            </h1>
            <p className="mt-4 max-w-[44ch] text-base text-white/75">
              Jouets, electromenager, robotique et voyage spatial. Stock
              disponible a Tsaralalana, prix importateur sans intermediaire.
            </p>
            <Link
              href={`/catalogue/${ALL_CATEGORIES_SLUG}`}
              className="bg-brand hover:bg-brand-dark font-display mt-6 inline-block self-start rounded-[10px] px-8 py-4 text-[15px] font-bold text-white"
            >
              Voir le catalogue
            </Link>
          </div>

          {heroSide.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
              {heroSide.map((category, index) => (
                <HeroCategoryCard
                  key={category.id}
                  category={category}
                  tint={HERO_TINTS[index % HERO_TINTS.length]}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-line mt-14 grid border-y sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((item) => (
          <div
            key={item.title}
            className="border-line flex flex-col gap-1.5 border-r px-8 py-7 last:border-r-0"
          >
            <span className="font-display text-navy text-[14.5px] font-bold">
              {item.title}
            </span>
            <span className="text-muted text-[13px] leading-snug">
              {item.desc}
            </span>
          </div>
        ))}
      </section>

      <CategorySection
        eyebrow="TOUT LE CATALOGUE"
        title="Nos rayons"
        categories={topLevel}
      />
    </div>
  );
}

function HeroCategoryCard({
  category,
  tint,
}: {
  category: Category;
  tint: (typeof HERO_TINTS)[number];
}) {
  return (
    <Link
      href={`/catalogue/${category.slug}`}
      className={`flex min-h-[200px] flex-col justify-between rounded-[18px] p-7 transition hover:-translate-y-0.5 ${tint.card}`}
    >
      <div>
        <span
          className={`font-mono text-[10px] tracking-[0.18em] ${tint.eyebrow}`}
        >
          RAYON PHARE
        </span>
        <h3
          className={`font-display mt-2.5 text-[25px] leading-[1.1] font-bold tracking-tight ${tint.title}`}
        >
          {category.name}
        </h3>
        <p className={`mt-2 text-[13px] opacity-75 ${tint.title}`}>
          {category.children.length > 0
            ? `${category.children.length} sous-rayon${category.children.length > 1 ? "s" : ""} a explorer`
            : "Tout le rayon en stock a Tsaralalana"}
        </p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <span className={`text-[13.5px] font-bold ${tint.link}`}>
          Decouvrir →
        </span>
        <ProductImage
          src={category.imageUrl}
          alt={category.name}
          className="h-20 w-[110px] shrink-0 rounded-[10px]"
        />
      </div>
    </Link>
  );
}

function CategorySection({
  eyebrow,
  title,
  categories,
}: {
  eyebrow: string;
  title: string;
  categories: Category[];
}) {
  return (
    <section className="px-4 pt-14 sm:px-8 lg:px-12">
      <div className="mb-6">
        <span className="text-brand font-mono text-[10.5px] tracking-[0.18em]">
          {eyebrow}
        </span>
        <h2 className="font-display text-navy mt-2 text-[32px] font-extrabold tracking-tight">
          {title}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/catalogue/${category.slug}`}
            className="border-line hover:border-brand overflow-hidden rounded-[14px] border bg-white transition"
          >
            <ProductImage
              src={category.imageUrl}
              alt={category.name}
              className="h-[150px] w-full"
            />
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-navy text-base font-bold tracking-tight">
                  {category.name}
                </span>
                <span className="text-muted text-[12.5px]">
                  {category.children.length > 0
                    ? `${category.children.length} sous-rayon${category.children.length > 1 ? "s" : ""}`
                    : "Voir les produits"}
                </span>
              </div>
              <span className="text-brand text-lg">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
