import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { ApiError } from "@/lib/api";
import { getAdminOrder } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";
import { formatDateTime, formatPrice } from "@/lib/format";
import { PAYMENT_METHODS, type OrderStatus } from "@/lib/types";

export const metadata = { title: "Detail commande" };

export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/admin/commandes/[id]">) {
  const { id } = await params;

  const order = await getAdminOrder(id, await getServerToken()).catch(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    },
  );

  const paymentLabel =
    PAYMENT_METHODS.find((entry) => entry.value === order.paymentMethod)
      ?.label ?? order.paymentMethod;

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/commandes"
        className="text-muted hover:text-brand text-[12.5px]"
      >
        ← Toutes les commandes
      </Link>

      <header className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-navy text-2xl font-extrabold">
            Commande {order.id.slice(0, 8)}
          </h1>
          <p className="text-muted mt-1 text-sm">
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="admin-card">
          <h2 className="font-display text-navy mb-4 text-[15px] font-extrabold">
            Articles
          </h2>

          {/*
            Nom et prix unitaire sont figes dans order_items au moment de la
            commande : ils ne suivent pas les modifications ulterieures du
            produit. `productId` peut etre nul si le produit a ete supprime.
          */}
          <ul className="divide-line divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3">
                <div className="min-w-0">
                  {item.productId ? (
                    <Link
                      href={`/admin/produits/${item.productId}`}
                      className="hover:text-brand text-[13.5px] font-semibold"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    <span className="text-[13.5px] font-semibold">
                      {item.productName}
                    </span>
                  )}
                  <p className="text-muted text-[12px]">
                    {item.quantity} × {formatPrice(item.unitPrice)}
                    {item.productId ? null : " · produit supprime du catalogue"}
                  </p>
                </div>
                <span className="font-display text-navy shrink-0 font-extrabold">
                  {formatPrice(Number(item.unitPrice) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="border-line mt-4 space-y-2 border-t pt-4 text-[13.5px]">
            <Row label="Sous-total" value={formatPrice(order.subtotal)} />
            <Row label="Livraison" value={formatPrice(order.shippingFee)} />
            <Row label="Paiement" value={paymentLabel} />
            <div className="flex justify-between pt-2">
              <dt className="font-display text-navy font-extrabold">Total</dt>
              <dd className="font-display text-brand text-lg font-extrabold">
                {formatPrice(order.total)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className="admin-card">
            <h2 className="font-display text-navy mb-3 text-[15px] font-extrabold">
              Compte client
            </h2>
            <p className="text-[13.5px] font-semibold">{order.user.fullName}</p>
            <p className="text-muted text-[12.5px]">{order.user.email}</p>
          </section>

          <section className="admin-card">
            <h2 className="font-display text-navy mb-3 text-[15px] font-extrabold">
              Livraison
            </h2>
            {/* Adresse figee sur la commande : elle ne suit pas le profil. */}
            <p className="text-[13.5px] font-semibold">{order.shippingName}</p>
            <p className="text-muted text-[12.5px]">{order.shippingPhone}</p>
            <p className="mt-2 text-[13px] whitespace-pre-line">
              {order.shippingAddress}
            </p>
          </section>

          <section className="admin-card">
            <h2 className="font-display text-navy mb-3 text-[15px] font-extrabold">
              Statut
            </h2>
            <OrderStatusForm
              orderId={order.id}
              current={order.status as OrderStatus}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
