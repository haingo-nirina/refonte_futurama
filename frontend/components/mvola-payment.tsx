"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getPayment, startPayment } from "@/lib/api";
import { formatMgPhone } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import type { Payment } from "@/lib/types";

/** Le client valide sur son telephone : relire souvent, sans marteler Aiven. */
const POLL_INTERVAL_MS = 3_000;

type Props = {
  orderId: string;
  /** Numero qui paie, fige sur la commande */
  phone: string | null;
  total: string;
  /**
   * Tentative deja lancee par le formulaire de commande. Sans elle (demande
   * refusee au premier envoi, retour plus tard sur la page), le bouton
   * « Payer avec MVola » la relance.
   */
  initialPayment?: Payment | null;
  /** Relire la page une fois paye : la page de commande affiche le statut. */
  refreshOnPaid?: boolean;
};

/**
 * Ecran « Validez sur votre téléphone » : suit la tentative MVola jusqu'à son
 * issue (`GET /payments/:id`), et propose de réessayer après un échec. Le
 * backend fait foi — c'est lui qui passe la commande en « Payée ».
 */
export function MvolaPayment({
  orderId,
  phone,
  total,
  initialPayment = null,
  refreshOnPaid = false,
}: Props) {
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(initialPayment);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentId = payment?.id;
  const waiting = payment?.status === "EN_ATTENTE";

  useEffect(() => {
    if (!paymentId || !waiting) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const fresh = await getPayment(paymentId!);
        if (cancelled) return;
        setPayment(fresh);
        if (fresh.status === "EN_ATTENTE") {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        } else if (fresh.status === "REUSSI" && refreshOnPaid) {
          router.refresh();
        }
      } catch {
        // réseau coupé un instant : on retente au tour suivant
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentId, waiting, refreshOnPaid, router]);

  async function onPay() {
    setStarting(true);
    setError(null);
    try {
      setPayment(await startPayment(orderId));
    } catch (payError) {
      setError(
        payError instanceof ApiError
          ? payError.message
          : "La demande MVola n'a pas pu être envoyée",
      );
    } finally {
      setStarting(false);
    }
  }

  const phoneLabel = phone ? formatMgPhone(phone) : "votre numéro MVola";

  if (payment?.status === "REUSSI") {
    return (
      <div className="bg-success-soft text-success rounded-[12px] px-4 py-3.5 text-[13.5px]">
        <p className="font-bold">Paiement reçu ✓</p>
        <p className="mt-1">
          {formatPrice(payment.amount)} payés depuis le{" "}
          {formatMgPhone(payment.phone)}. Merci !
        </p>
      </div>
    );
  }

  if (waiting) {
    return (
      <div
        role="status"
        className="bg-mvola-soft text-mvola-ink flex gap-3 rounded-[12px] px-4 py-3.5 text-[13.5px]"
      >
        <span
          aria-hidden="true"
          className="border-mvola-ink mt-0.5 size-4 flex-none animate-spin rounded-full border-2 border-t-transparent"
        />
        <div>
          <p className="font-bold">Validez le paiement sur votre téléphone</p>
          <p className="mt-1">
            Une demande de {formatPrice(total)} est arrivée sur le{" "}
            <strong>{phoneLabel}</strong>. Saisissez votre code secret MVola
            pour confirmer. Cette page se met à jour toute seule.
          </p>
        </div>
      </div>
    );
  }

  // Pas encore de tentative, ou la dernière a échoué.
  return (
    <div className="border-line rounded-[12px] border px-4 py-3.5 text-[13.5px]">
      {payment?.status === "ECHOUE" ? (
        <p className="text-brand font-semibold">
          Le paiement n&apos;a pas abouti
          {payment.failureReason ? ` : ${payment.failureReason}` : ""}.
        </p>
      ) : (
        <p className="text-ink font-semibold">
          Votre commande attend son paiement.
        </p>
      )}
      <p className="text-muted mt-1">
        Une demande de {formatPrice(total)} sera envoyée sur le {phoneLabel}.
      </p>
      {error ? <p className="text-brand mt-2 font-medium">{error}</p> : null}
      <button
        type="button"
        disabled={starting}
        onClick={onPay}
        className="bg-brand hover:bg-brand-dark font-display mt-3 w-full rounded-[10px] py-3 text-[14px] font-bold text-white disabled:opacity-50"
      >
        {starting
          ? "Envoi…"
          : payment?.status === "ECHOUE"
            ? "Réessayer le paiement"
            : "Payer avec MVola"}
      </button>
    </div>
  );
}
