import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, getOrder } from "@/lib/api";
import { ALL_CATEGORIES_SLUG } from "@/lib/catalogue";
import { formatDate, formatPrice, toAmount } from "@/lib/format";
import { PAYMENT_METHODS, type Order } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente de confirmation",
  confirmed: "Confirmee",
  shipped: "Expediee",
  delivered: "Livree",
  cancelled: "Annulee",
};

async function loadOrder(id: string): Promise<Order> {
  try {
    return await getOrder(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export default async function OrderConfirmationPage({
  params,
}: PageProps<"/commande/[id]">) {
  const { id } = await params;
  const order = await loadOrder(id);

  const paymentLabel =
    PAYMENT_METHODS.find((method) => method.value === order.paymentMethod)
      ?.label ?? order.paymentMethod;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <div className="border-line rounded-[18px] border bg-white p-8 sm:p-10">
        <span className="bg-success-soft text-success inline-block rounded-md px-3 py-1.5 text-[12.5px] font-semibold">
          Commande enregistree
        </span>

        <h1 className="font-display text-navy mt-4 text-[30px] font-extrabold tracking-tight">
          Merci {order.customerName}&nbsp;!
        </h1>
        <p className="text-muted mt-2 text-sm">
          Nous vous rappelons au {order.customerPhone} pour confirmer la
          livraison. Commande passee le {formatDate(order.createdAt)}.
        </p>

        <dl className="border-line mt-8 grid gap-x-8 gap-y-4 border-t pt-6 sm:grid-cols-2">
          <Detail label="Numero de commande" value={order.id} mono />
          <Detail
            label="Statut"
            value={STATUS_LABELS[order.status] ?? order.status}
          />
          <Detail label="Paiement" value={paymentLabel} />
          <Detail label="Livraison" value={order.customerAddress} />
        </dl>

        <section className="border-line mt-8 border-t pt-6">
          <h2 className="font-display text-navy mb-4 text-[15px] font-bold">
            Articles
          </h2>

          <div className="flex flex-col">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="border-line flex items-baseline justify-between gap-4 border-b py-3 text-sm last:border-b-0"
              >
                <span className="text-ink">
                  {item.productName}
                  <span className="text-muted"> × {item.quantity}</span>
                </span>
                <span className="font-display text-navy flex-none font-bold">
                  {formatPrice(toAmount(item.unitPrice) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="text-muted mt-4 flex justify-between text-[13.5px]">
            <span>Sous-total</span>
            <span className="text-ink font-medium">
              {formatPrice(order.subtotal)}
            </span>
          </div>
          <div className="text-muted mt-1 flex justify-between text-[13.5px]">
            <span>Livraison</span>
            <span className="text-ink font-medium">
              {toAmount(order.shippingFee) === 0
                ? "Offerte"
                : formatPrice(order.shippingFee)}
            </span>
          </div>
          <div className="border-line mt-3 flex justify-between border-t pt-4">
            <span className="font-display text-navy font-bold">Total</span>
            <span className="font-display text-navy text-[22px] font-extrabold tracking-tight">
              {formatPrice(order.total)}
            </span>
          </div>
        </section>

        <Link
          href={`/catalogue/${ALL_CATEGORIES_SLUG}`}
          className="bg-brand hover:bg-brand-dark font-display mt-8 inline-block rounded-[10px] px-6 py-3.5 text-sm font-bold text-white"
        >
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted text-xs font-medium">{label}</dt>
      <dd
        className={`text-ink mt-1 text-sm ${mono ? "font-mono text-[12.5px] break-all" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

export const metadata = { title: "Commande confirmee" };
