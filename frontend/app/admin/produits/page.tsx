import Link from "next/link";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ActiveBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/admin/page-header";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { ProductImage } from "@/components/product-image";
import { getCategories } from "@/lib/api";
import { getAdminProducts } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";
import { formatPrice } from "@/lib/format";

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

  const token = await getServerToken();
  const [categories, { data, meta }] = await Promise.all([
    getCategories(),
    getAdminProducts(
      {
        page,
        limit: PAGE_SIZE,
        q: q || undefined,
        categoryId: categoryId || undefined,
        // `state` vide = actifs et inactifs melanges.
        isActive: state === "" ? undefined : state === "active",
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
        <div className="border-line overflow-x-auto rounded-[14px] border bg-white">
          <table className="w-full min-w-[760px] text-left text-[13.5px]">
            <thead className="bg-cream-deep text-muted text-[12px] uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Produit</th>
                <th className="px-4 py-3 font-semibold">Categorie</th>
                <th className="px-4 py-3 font-semibold">Prix</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Etat</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {data.map((product) => (
                <tr key={product.id} className="hover:bg-cream-deep transition">
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
                      <span className="min-w-0">
                        <span className="group-hover:text-brand block font-semibold">
                          {product.name}
                        </span>
                        {product.reference ? (
                          <span className="text-muted block text-[12px]">
                            {product.reference}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </td>
                  <td className="text-muted px-4 py-3">
                    {product.category.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-display text-navy font-extrabold">
                      {formatPrice(product.promoPrice ?? product.price)}
                    </span>
                    {product.promoPrice ? (
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
                  <td className="px-4 py-3">
                    <ProductRowActions product={product} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
