"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { updateOrderStatus } from "@/lib/admin-api";
import { nextStatuses } from "@/lib/order-status";
import {
  ORDER_STATUSES,
  type FulfillmentMethod,
  type OrderStatus,
} from "@/lib/types";

/**
 * Ne propose que les statuts que le backend accepte depuis le statut courant
 * (`lib/order-status.ts`). Le backend reste juge : il refuse en 400 un passage
 * interdit, et en 409 si un autre admin a change le statut entre-temps.
 */
export function OrderStatusForm({
  orderId,
  current,
  fulfillment,
}: {
  orderId: string;
  current: OrderStatus;
  fulfillment: FulfillmentMethod;
}) {
  const router = useRouter();
  const options = nextStatuses(current, fulfillment);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (options.length === 0) {
    return (
      <p className="text-muted text-[13px]">
        Statut final : cette commande ne peut plus changer.
      </p>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!status) return;

    setPending(true);
    setError(null);
    setSaved(false);

    try {
      await updateOrderStatus(orderId, status, note.trim());
      setSaved(true);
      setStatus("");
      setNote("");
      // La page est un Server Component : c'est le serveur qui doit relire.
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Mise a jour impossible",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="admin-label" htmlFor="order-next-status">
        Passer à
      </label>
      <select
        id="order-next-status"
        value={status}
        onChange={(event) => {
          setStatus(event.target.value as OrderStatus);
          setSaved(false);
        }}
        className="admin-input"
      >
        <option value="">Choisir un statut…</option>
        {options.map((value) => (
          <option key={value} value={value}>
            {ORDER_STATUSES.find((entry) => entry.value === value)?.label ??
              value}
          </option>
        ))}
      </select>

      {status === "PAYEE" ? (
        <p className="text-muted text-[12.5px]">
          Le paiement sera aussi marqué « Payé » et la date prévue calculée.
        </p>
      ) : null}
      {status === "ANNULEE" ? (
        <p className="text-brand text-[12.5px]">
          Les articles seront remis en stock. Ce statut est définitif.
        </p>
      ) : null}

      <label className="admin-label" htmlFor="order-status-note">
        Commentaire (facultatif)
      </label>
      <textarea
        id="order-status-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        rows={2}
        className="admin-input"
        placeholder="Ex. paiement MVola vérifié, réf. 123456"
      />

      <button
        type="submit"
        disabled={pending || !status}
        className="admin-button w-full"
      >
        {pending ? "Enregistrement…" : "Mettre a jour"}
      </button>

      {error ? <p className="text-brand text-[12.5px]">{error}</p> : null}
      {saved && !error ? (
        <p className="text-success text-[12.5px]">Statut mis a jour.</p>
      ) : null}
    </form>
  );
}
