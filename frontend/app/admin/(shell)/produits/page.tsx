import Link from "next/link";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ActiveBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/admin/page-header";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import {
  ProductBulkBar,
  ProductSelectAll,
  ProductSelectCheckbox,
  ProductSelectionProvider,
} from "@/components/admin/product-selection";
import { ProductImage } from "@/components/product-image";
import { getCategories } from "@/lib/api";
import { getAdminProducts } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata = { title: "Produits" };

const PAGE_SIZE = 20;

function readParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/produits">) {
  const params = await searchParams;

  const q = readParam(params.q);
  const categoryId = readParam(params.categoryId);
  const state = readParam(params.state);
  const page = Math.max(1, Number.parseInt(readParam(params.page), 10) || 1);

  // `state` vide = actifs et inactifs melanges.
  const isActive = state === "" ? undefined : state === "active";

  const token = await getServerToken();
  const [categories, { data, meta }] = await Promise.all([
    getCategories(),
    getAdminProducts(
      {
        page,
        limit: PAGE_SIZE,
        q: q || undefined,
        categoryId: categoryId || undefined,
        isActive,
      },
      token,
    ),
  ]);

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle={`${meta.total} produit(s)`}
        action={{ href: "/admin/produits/nouveau", label: "Nouveau produit" }}
      />

      <form
        method="get"
        className="border-line mb-6 grid gap-3 rounded-[14px] border bg-white p-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <label className="block">
          <span className="admin-label">Recherche</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nom ou reference"
            className="admin-input"
          />
        </label>

        <label className="block">
          <span className="admin-label">Categorie</span>
          <select
            name="categoryId"
            defaultValue={categoryId}
            className="admin-input"
          >
            <option value="">Toutes</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parent
                  ? `${category.parent.name} › ${category.name}`
                  : category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="admin-label">Publication</span>
          <select name="state" defaultValue={state} className="admin-input">
            <option value="">Tous</option>
            <option value="active">En ligne</option>
            <option value="inactive">Hors ligne</option>
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="bg-navy hover:bg-navy-soft h-[42px] flex-1 rounded-[10px] px-4 text-[13.5px] font-bold text-white transition"
          >
            Filtrer
          </button>
          <Link href="/admin/produits" className="admin-button-ghost">
            Reset
          </Link>
        </div>
      </form>

      {data.length === 0 ? (
        <p className="border-line text-muted rounded-[14px] border bg-white p-8 text-center text-sm">
          Aucun produit ne correspond a ces filtres.
        </p>
      ) : (
        <ProductSelectionProvider
          // Une selection ne survit pas a un changement de page ou de filtre.
          key={`${page}|${q}|${categoryId}|${state}`}
          pageIds={data.map((product) => product.id)}
          total={meta.total}
          filters={{
            q: q || undefined,
            categoryId: categoryId || undefined,
            isActive,
          }}
        >
          <ProductBulkBar />
          <div className="border-line overflow-x-auto rounded-[14px] border bg-white">
            <table className="w-full min-w-[1320px] text-left text-[13.5px]">
              <thead className="bg-cream-deep text-muted text-[12px] uppercase">
                <tr>
                  <th className="w-10 py-3 pr-0 pl-4">
                    <ProductSelectAll />
                  </th>
                  <th className="px-4 py-3 font-semibold">Produit</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Couleurs</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Categorie</th>
                  <th className="px-4 py-3 font-semibold">Prix</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Etat</th>
                  <th className="px-4 py-3 font-semibold">Cree le</th>
                  <th className="px-4 py-3 font-semibold">Modifie le</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {data.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-cream-deep transition"
                  >
                    <td className="py-3 pr-0 pl-4">
                      <ProductSelectCheckbox
                        id={product.id}
                        name={product.name}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/produits/${product.id}`}
                        className="group flex items-center gap-3"
                      >
                        <span className="size-11 shrink-0 overflow-hidden rounded-[8px]">
                          <ProductImage
                            src={product.images[0]?.imageUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        </span>
                        <span className="group-hover:text-brand min-w-0 font-semibold">
                          {product.name}
                        </span>
                      </Link>
                    </td>
                    <td className="text-muted px-4 py-3 text-[12.5px] whitespace-nowrap">
                      {product.reference ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {product.colors.length > 0 ? (
                        <span className="flex max-w-[180px] flex-wrap gap-1">
                          {product.colors.map((color) => (
                            <span
                              key={color}
                              className="bg-cream-deep rounded-md px-2 py-0.5 text-[12px] whitespace-nowrap"
                            >
                              {color}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-muted px-4 py-3 text-[12.5px]">
                      {/* Tronquee a deux lignes : le texte complet reste au survol. */}
                      <span
                        title={product.description ?? undefined}
                        className="line-clamp-2 max-w-[260px]"
                      >
                        {product.description ?? "—"}
                      </span>
                    </td>
                    <td className="text-muted px-4 py-3">
                      {product.category.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-display text-navy font-extrabold">
                        {formatPrice(
                          product.activePromotion?.discountedPrice ??
                            product.price,
                        )}
                      </span>
                      {product.activePromotion ? (
                        <span className="text-muted-light ml-1 text-[12px] line-through">
                          {formatPrice(product.price)}
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        product.stock === 0 ? "text-brand" : ""
                      }`}
                    >
                      {product.stock}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge isActive={product.isActive} />
                    </td>
                    <td className="text-muted px-4 py-3 text-[12.5px] whitespace-nowrap">
                      {formatDate(product.createdAt)}
                    </td>
                    <td className="text-muted px-4 py-3 text-[12.5px] whitespace-nowrap">
                      {formatDate(product.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ProductRowActions product={product} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProductSelectionProvider>
      )}

      <AdminPagination
        basePath="/admin/produits"
        page={meta.page}
        totalPages={meta.totalPages}
        params={{ q, categoryId, state }}
      />
    </div>
  );
}
