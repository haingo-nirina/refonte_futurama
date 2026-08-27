"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { updateOrderStatus } from "@/lib/admin-api";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

/**
 * Le backend accepte n'importe quelle transition entre statuts : il n'y a pas
 * de machine a etats cote serveur. On ne simule donc pas de garde-fou ici, ce
 * serait une regle metier posee au mauvais endroit.
 */
export function OrderStatusForm({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    try {
      await updateOrderStatus(orderId, status);
      setSaved(true);
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
      <select
        value={status}
        onChange={(event) => {
          setStatus(event.target.value as OrderStatus);
          setSaved(false);
        }}
        className="admin-input"
      >
        {ORDER_STATUSES.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={pending || status === current}
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
