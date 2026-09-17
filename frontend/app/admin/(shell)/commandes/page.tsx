import Link from "next/link";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/admin/page-header";
import { getServerToken } from "@/lib/auth-server";
import { getAdminOrders } from "@/lib/admin-api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const metadata = { title: "Commandes" };

const PAGE_SIZE = 20;

function readParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/commandes">) {
  const params = await searchParams;

  const status = ORDER_STATUSES.some(
    (entry) => entry.value === readParam(params.status),
  )
    ? (readParam(params.status) as OrderStatus)
    : undefined;
  const q = readParam(params.q);
  const dateFrom = readParam(params.dateFrom);
  const dateTo = readParam(params.dateTo);
  const page = Math.max(1, Number.parseInt(readParam(params.page), 10) || 1);

  const { data, meta } = await getAdminOrders(
    {
      page,
      limit: PAGE_SIZE,
      status,
      q: q || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    await getServerToken(),
  );

  return (
    <div>
      <PageHeader
        title="Commandes"
        subtitle={`${meta.total} commande(s)`}
      />

      {/*
        Formulaire GET natif : les filtres vivent dans l'URL, donc partageables,
        rechargeables et compatibles avec le rendu serveur. Aucun JS necessaire.
      */}
      <form
        method="get"
        className="border-line mb-6 grid gap-3 rounded-[14px] border bg-white p-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <Field label="Recherche">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nom, telephone, email"
            className="admin-input"
          />
        </Field>

        <Field label="Statut">
          <select name="status" defaultValue={status ?? ""} className="admin-input">
            <option value="">Tous</option>
            {ORDER_STATUSES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Du">
          <input
            type="date"
            name="dateFrom"
            defaultValue={dateFrom}
            className="admin-input"
          />
        </Field>

        <Field label="Au">
          <input
            type="date"
            name="dateTo"
            defaultValue={dateTo}
            className="admin-input"
          />
        </Field>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="bg-navy hover:bg-navy-soft h-[42px] flex-1 rounded-[10px] px-4 text-[13.5px] font-bold text-white transition"
          >
            Filtrer
          </button>
          <Link
            href="/admin/commandes"
            className="border-line-strong text-muted hover:border-brand hover:text-brand flex h-[42px] items-center rounded-[10px] border px-4 text-[13.5px] font-bold transition"
          >
            Reset
          </Link>
        </div>
      </form>

      {data.length === 0 ? (
        <p className="border-line text-muted rounded-[14px] border bg-white p-8 text-center text-sm">
          Aucune commande ne correspond a ces filtres.
        </p>
      ) : (
        <div className="border-line overflow-x-auto rounded-[14px] border bg-white">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead className="bg-cream-deep text-muted text-[12px] uppercase">
              <tr>
                <Th>Date</Th>
                <Th>Client</Th>
                <Th>Livraison</Th>
                <Th>Articles</Th>
                <Th>Total</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {data.map((order) => (
                <tr key={order.id} className="hover:bg-cream-deep transition">
                  <Td>
                    <Link
                      href={`/admin/commandes/${order.id}`}
                      className="hover:text-brand font-semibold"
                    >
                      {formatDateTime(order.createdAt)}
                    </Link>
                  </Td>
                  <Td>
                    <span className="block font-semibold">
                      {order.user.fullName}
                    </span>
                    <span className="text-muted text-[12px]">
                      {order.user.email}
                    </span>
                  </Td>
                  <Td>
                    <span className="block">{order.shippingName}</span>
                    <span className="text-muted text-[12px]">
                      {order.shippingPhone}
                    </span>
                  </Td>
                  <Td>{order.items.length}</Td>
                  <Td className="font-display text-navy font-extrabold">
                    {formatPrice(order.total)}
                  </Td>
                  <Td>
                    <OrderStatusBadge status={order.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination
        basePath="/admin/commandes"
        page={meta.page}
        totalPages={meta.totalPages}
        params={{ q, status, dateFrom, dateTo }}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-muted mb-1 block text-[12px] font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
