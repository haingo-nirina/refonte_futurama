import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { ApiError, getMyOrders } from "@/lib/api";
import { getServerToken } from "@/lib/auth-server";
import { ALL_CATEGORIES_SLUG } from "@/lib/catalogue";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";

const LOGIN_URL = `/connexion?next=${encodeURIComponent("/commandes")}`;

/**
 * Seul chemin vers une commande une fois la confirmation quittee : le panier
 * est vide des la creation, un paiement refuse ne se relance que d'ici.
 */
async function loadOrders(): Promise<Order[]> {
  const token = await getServerToken();
  if (!token) redirect(LOGIN_URL);

  try {
    return await getMyOrders(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(LOGIN_URL);
    throw error;
  }
}

export default async function MyOrdersPage() {
  const orders = await loadOrders();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="font-display text-navy text-[30px] font-extrabold tracking-tight">
        Mes commandes
      </h1>

      {orders.length === 0 ? (
        <div className="border-line mt-6 rounded-[18px] border bg-white p-8 text-center">
          <p className="text-muted text-sm">
            Vous n&apos;avez pas encore passé de commande.
          </p>
          <Link
            href={`/catalogue/${ALL_CATEGORIES_SLUG}`}
            className="bg-brand hover:bg-brand-dark font-display mt-5 inline-block rounded-[10px] px-6 py-3.5 text-sm font-bold text-white"
          >
            Parcourir le catalogue
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const awaitingPayment =
    order.paymentMethod === "MVOLA" && order.status === "EN_ATTENTE_PAIEMENT";
  const articles = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href={`/commande/${order.id}`}
      className="border-line hover:border-brand block rounded-[14px] border bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-ink font-mono text-[12.5px]">{order.number}</span>
        <OrderStatusBadge status={order.status} />
      </div>

      <p className="text-muted mt-2 text-[13px]">
        Passée le {formatDate(order.createdAt)} · {articles} article
        {articles > 1 ? "s" : ""}
      </p>
      <p className="text-ink mt-1 truncate text-sm">
        {order.items.map((item) => item.productName).join(", ")}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-navy text-[17px] font-extrabold">
          {formatPrice(order.total)}
        </span>
        {awaitingPayment ? (
          <span className="text-brand text-[13px] font-bold">
            Payer cette commande →
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export const metadata = { title: "Mes commandes" };
