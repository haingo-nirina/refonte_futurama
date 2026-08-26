import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/api";
import {
  ALL_CATEGORIES_SLUG,
  PAGE_SIZE,
  collectCategoryIds,
  matchesSearch,
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
  const { q, page: rawPage } = await searchParams;

  const search = typeof q === "string" ? q.trim() : "";
  const page = Math.max(1, Number.parseInt(String(rawPage ?? "1"), 10) || 1);

  const categories = await getCategories();
  const isAll = categorySlug === ALL_CATEGORIES_SLUG;
  const category = categories.find((item) => item.slug === categorySlug);

  if (!isAll && !category) notFound();

  const categoryIds = category
    ? collectCategoryIds(categories, category.id)
    : [];
  const children = categories.filter(
    (item) => category && item.parentId === category.id,
  );

  const { products, totalPages, total } = await loadProducts({
    categoryIds,
    search,
    page,
  });

  const basePath = `/catalogue/${categorySlug}`;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-12">
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

      <header className="border-line mb-7 border-b pb-6">
        <h1 className="font-display text-navy text-[38px] font-extrabold tracking-tight">
          {category?.name ?? "Tout le catalogue"}
        </h1>
        <p className="text-muted mt-2 text-sm">
          {search ? (
            <>
              {total} resultat{total > 1 ? "s" : ""} pour «&nbsp;{search}&nbsp;»
            </>
          ) : (
            <>
              {total} produit{total > 1 ? "s" : ""} · stock disponible a
              Tsaralalana
            </>
          )}
        </p>
      </header>

      {children.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-2">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/catalogue/${child.slug}`}
              className="border-line-strong hover:border-brand hover:text-brand text-ink rounded-full border px-4 py-2 text-[13px] font-medium"
            >
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}

      {products.length === 0 ? (
        <p className="text-muted border-line rounded-[14px] border bg-white px-6 py-16 text-center text-sm">
          Aucun produit dans ce rayon pour le moment.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <Pagination
        basePath={basePath}
        page={page}
        totalPages={totalPages}
        query={search || undefined}
      />
    </div>
  );
}

/**
 * Deux strategies, selon ce que `GET /products` sait faire :
 *
 * - un seul `categoryId` et pas de recherche : l'API pagine elle-meme, on lui
 *   demande exactement la page affichee ;
 * - rayon parent (plusieurs categories) ou recherche par nom : l'API ne sait
 *   filtrer ni sur plusieurs categories ni sur le nom. On charge le catalogue
 *   en entier puis on filtre et pagine ici. A remplacer par un vrai filtre
 *   backend quand le catalogue depassera MAX_WIDE_PAGES * API_MAX_LIMIT.
 */
async function loadProducts({
  categoryIds,
  search,
  page,
}: {
  categoryIds: string[];
  search: string;
  page: number;
}): Promise<{ products: Product[]; totalPages: number; total: number }> {
  if (!search && categoryIds.length <= 1) {
    const { data, meta } = await getProducts({
      categoryId: categoryIds[0],
      page,
      limit: PAGE_SIZE,
    });

    return { products: data, totalPages: meta.totalPages, total: meta.total };
  }

  const all = await loadEveryProduct();

  const filtered = all.filter((product) => {
    const inCategory =
      categoryIds.length === 0 || categoryIds.includes(product.categoryId);
    return inCategory && (!search || matchesSearch(product.name, search));
  });

  const start = (page - 1) * PAGE_SIZE;

  return {
    products: filtered.slice(start, start + PAGE_SIZE),
    totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    total: filtered.length,
  };
}

/**
 * Aspire le catalogue complet. La premiere reponse donne `totalPages`, les
 * suivantes partent en parallele : chaque aller-retour vers Aiven coute ~2 s.
 */
async function loadEveryProduct(): Promise<Product[]> {
  const first = await getProducts({ page: 1, limit: API_MAX_LIMIT });
  const lastPage = Math.min(first.meta.totalPages, MAX_WIDE_PAGES);

  if (lastPage <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, index) =>
      getProducts({ page: index + 2, limit: API_MAX_LIMIT }),
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
