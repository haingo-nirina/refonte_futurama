import Link from "next/link";
import { notFound } from "next/navigation";
import { FiltersPanel } from "@/components/catalogue/filters-panel";
import { SortSelect } from "@/components/catalogue/sort-select";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/api";
import {
  ALL_CATEGORIES_SLUG,
  PAGE_SIZE,
  PARAM,
  applyFilters,
  buildFacets,
  collectCategoryIds,
  filtersToQuery,
  parseFilters,
  sortProducts,
} from "@/lib/catalogue";
import type { Category, Product } from "@/lib/types";

/** `limit` est plafonne a 100 par FindProductsQueryDto cote backend. */
const API_MAX_LIMIT = 100;

/** Garde-fou du chargement large : au-dela, on tronque plutot que marteler l'API. */
const MAX_WIDE_PAGES = 5;

export default async function CataloguePage({
  params,
  searchParams,
}: PageProps<"/catalogue/[categorySlug]">) {
  const { categorySlug } = await params;
  const filters = parseFilters(await searchParams);

  const categories = await getCategories();
  const isAll = categorySlug === ALL_CATEGORIES_SLUG;
  const category = categories.find((item) => item.slug === categorySlug);

  if (!isAll && !category) notFound();

  const categoryIds = category
    ? collectCategoryIds(categories, category.id)
    : [];

  const rayon = await loadRayon(categoryIds);
  const facets = buildFacets(rayon, filters);
  const matching = sortProducts(applyFilters(rayon, filters), filters.sort);

  const total = matching.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const products = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const basePath = `/catalogue/${categorySlug}`;
  const query = filtersToQuery(filters, { page: 1 });
  const sortlessQuery = new URLSearchParams(query);
  sortlessQuery.delete(PARAM.sort);

  return (
    <div className="px-4 py-7 sm:px-8 lg:px-12">
      <nav className="text-muted mb-5 text-[12.5px]">
        <Link href="/" className="hover:text-brand">
          Accueil
        </Link>
        {category?.parent ? (
          <>
            {" · "}
            <Link
              href={`/catalogue/${category.parent.slug}`}
              className="hover:text-brand"
            >
              {category.parent.name}
            </Link>
          </>
        ) : null}
        {" · "}
        <span className="text-ink font-medium">
          {category?.name ?? "Tout le catalogue"}
        </span>
      </nav>

      <header className="border-line mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="font-display text-navy text-[38px] font-extrabold tracking-tight">
            {category?.name ?? "Tout le catalogue"}
          </h1>
          <p className="text-muted mt-2 text-sm">
            {filters.search ? (
              <>
                {total} resultat{total > 1 ? "s" : ""} pour «&nbsp;
                {filters.search}&nbsp;»
              </>
            ) : (
              <>
                {total} produit{total > 1 ? "s" : ""} · stock disponible a
                Tsaralalana
              </>
            )}
          </p>
        </div>

        <SortSelect
          basePath={basePath}
          query={sortlessQuery.toString()}
          value={filters.sort}
        />
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[240px_1fr] lg:gap-10">
        <FiltersPanel
          basePath={basePath}
          filters={filters}
          facets={facets}
          rayons={rayonLinks(categories, category)}
        />

        <div>
          {products.length === 0 ? (
            <p className="text-muted border-line rounded-[14px] border bg-white px-6 py-16 text-center text-sm">
              Aucun produit ne correspond a ces filtres.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination
            basePath={basePath}
            page={page}
            totalPages={totalPages}
            params={query}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Sous-rayons du rayon ouvert, ou ses freres quand on est deja sur une
 * feuille : la colonne de gauche doit toujours proposer une navigation.
 */
function rayonLinks(categories: Category[], category?: Category) {
  if (!category) {
    return categories
      .filter((item) => !item.parentId)
      .map((item) => ({ name: item.name, slug: item.slug, active: false }));
  }

  const children = categories.filter((item) => item.parentId === category.id);
  const siblings = categories.filter(
    (item) => item.parentId === category.parentId,
  );
  const shown = children.length > 0 ? children : siblings;

  return shown.map((item) => ({
    name: item.name,
    slug: item.slug,
    active: item.id === category.id,
  }));
}

/**
 * Charge le rayon **en entier**, pas seulement la page affichee : les
 * compteurs de la colonne de filtres portent sur tout le rayon, et l'API ne
 * sait ni compter par facette, ni filtrer sur plusieurs categories, ni trier.
 * A remplacer par un vrai filtre backend quand le catalogue depassera
 * MAX_WIDE_PAGES * API_MAX_LIMIT produits.
 */
async function loadRayon(categoryIds: string[]): Promise<Product[]> {
  // Rayon feuille : l'API sait filtrer, inutile d'aspirer tout le catalogue.
  if (categoryIds.length === 1) {
    return loadEveryProduct({ categoryId: categoryIds[0] });
  }

  const all = await loadEveryProduct();

  if (categoryIds.length === 0) return all;

  return all.filter((product) => categoryIds.includes(product.categoryId));
}

/**
 * Aspire toutes les pages d'une requete. La premiere reponse donne
 * `totalPages`, les suivantes partent en parallele : chaque aller-retour vers
 * Aiven coute ~2 s.
 */
async function loadEveryProduct(
  query: { categoryId?: string } = {},
): Promise<Product[]> {
  const first = await getProducts({ ...query, page: 1, limit: API_MAX_LIMIT });
  const lastPage = Math.min(first.meta.totalPages, MAX_WIDE_PAGES);

  if (lastPage <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, index) =>
      getProducts({ ...query, page: index + 2, limit: API_MAX_LIMIT }),
    ),
  );

  return [...first.data, ...rest.flatMap((response) => response.data)];
}

export async function generateMetadata({
  params,
}: PageProps<"/catalogue/[categorySlug]">) {
  const { categorySlug } = await params;

  if (categorySlug === ALL_CATEGORIES_SLUG) return { title: "Catalogue" };

  const categories = await getCategories().catch<Category[]>(() => []);
  const category = categories.find((item) => item.slug === categorySlug);

  return { title: category?.name ?? "Catalogue" };
}
