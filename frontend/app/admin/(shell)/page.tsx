import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { getServerToken } from "@/lib/auth-server";
import { getDashboard } from "@/lib/admin-api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/types";

export const metadata = { title: "Tableau de bord" };

export default async function AdminDashboardPage() {
  const stats = await getDashboard(await getServerToken());

  return (
    <div>
      <h1 className="font-display text-navy mb-6 text-2xl font-extrabold">
        Tableau de bord
      </h1>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="CA du jour"
          value={formatPrice(stats.revenue.today)}
          hint={`${stats.orders.today} commande(s)`}
        />
        <StatCard
          label="CA du mois"
          value={formatPrice(stats.revenue.month)}
          hint={`${stats.orders.month} commande(s)`}
        />
        <StatCard
          label="Panier moyen"
          value={formatPrice(stats.revenue.averageOrder)}
          hint={`${stats.orders.allTime} commande(s) au total`}
        />
        <StatCard
          label="Comptes clients"
          value={String(stats.customers)}
          hint={`${stats.catalog.products} produits, ${stats.catalog.categories} categories`}
        />
      </section>

      <p className="text-muted mt-3 text-[12px]">
        Les commandes annulees sont exclues du chiffre d&apos;affaires.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Commandes par statut">
          <ul className="space-y-2.5">
            {ORDER_STATUSES.map((status) => (
              <li
                key={status.value}
                className="flex items-center justify-between gap-3"
              >
                <Link
                  href={`/admin/commandes?status=${status.value}`}
                  className="hover:opacity-80"
                >
                  <OrderStatusBadge status={status.value} />
                </Link>
                <span className="font-display text-navy text-lg font-extrabold">
                  {stats.orders.byStatus[status.value] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="A traiter">
          <ul className="space-y-3 text-[13.5px]">
            <li className="flex items-center justify-between gap-3">
              <span>Commandes en attente</span>
              <strong className="font-display text-navy text-lg">
                {stats.orders.byStatus.pending ?? 0}
              </strong>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Produits hors ligne</span>
              <strong className="font-display text-navy text-lg">
                {stats.catalog.inactiveProducts}
              </strong>
            </li>
          </ul>
        </Panel>

        <Panel
          title={`Stock faible (≤ ${stats.catalog.lowStockThreshold})`}
          action={{ href: "/admin/produits", label: "Voir les produits" }}
        >
          {stats.catalog.lowStock.length === 0 ? (
            <Empty>Aucun produit en tension.</Empty>
          ) : (
            <ul className="space-y-2 text-[13.5px]">
              {stats.catalog.lowStock.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/admin/produits/${product.id}`}
                    className="hover:text-brand truncate"
                  >
                    {product.name}
                  </Link>
                  <span
                    className={`font-display shrink-0 font-extrabold ${
                      product.stock === 0 ? "text-brand" : "text-navy"
                    }`}
                  >
                    {product.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Meilleures ventes">
          {stats.topProducts.length === 0 ? (
            <Empty>Aucune vente enregistree.</Empty>
          ) : (
            <ul className="space-y-2 text-[13.5px]">
              {stats.topProducts.map((product) => (
                <li
                  key={product.productName}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate">{product.productName}</span>
                  <span className="font-display text-navy shrink-0 font-extrabold">
                    {product.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Dernieres commandes"
        action={{ href: "/admin/commandes", label: "Tout voir" }}
        className="mt-6"
      >
        {stats.recentOrders.length === 0 ? (
          <Empty>Aucune commande.</Empty>
        ) : (
          <ul className="divide-line divide-y">
            {stats.recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/commandes/${order.id}`}
                  className="hover:bg-cream-deep -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-[8px] px-2 py-3 transition"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">
                      {order.shippingName}
                    </p>
                    <p className="text-muted text-[12px]">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <span className="font-display text-navy font-extrabold">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="border-line rounded-[14px] border bg-white p-5">
      <p className="text-muted text-[12px] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="font-display text-navy mt-2 text-2xl font-extrabold">
        {value}
      </p>
      <p className="text-muted-light mt-1 text-[12px]">{hint}</p>
    </article>
  );
}

function Panel({
  title,
  action,
  className = "",
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`border-line rounded-[14px] border bg-white p-5 ${className}`}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-navy text-[15px] font-extrabold">
          {title}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="text-brand text-[12.5px] font-bold hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-light text-[13px]">{children}</p>;
}
