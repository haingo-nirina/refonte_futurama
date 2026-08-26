"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOrder } from "@/lib/api";
import { getSessionId, notifyCartUpdated } from "@/lib/session";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";

export function CheckoutForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const order = await createOrder({
        session_id: getSessionId(),
        customerName: String(form.get("customerName") ?? "").trim(),
        customerPhone: String(form.get("customerPhone") ?? "").trim(),
        customerAddress: String(form.get("customerAddress") ?? "").trim(),
        paymentMethod: form.get("paymentMethod") as PaymentMethod,
      });

      // Le backend vide le panier a la creation de la commande.
      notifyCartUpdated();
      router.push(`/commande/${order.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "La commande n'a pas pu etre enregistree",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-line mt-4 border-t pt-5">
      <h3 className="font-display text-navy mb-4 text-[15px] font-bold">
        Vos coordonnees
      </h3>

      <div className="flex flex-col gap-3">
        <Field
          name="customerName"
          label="Nom complet"
          autoComplete="name"
          placeholder="Rakoto Andrianina"
        />
        <Field
          name="customerPhone"
          label="Telephone"
          type="tel"
          autoComplete="tel"
          placeholder="+261 32 00 000 00"
        />
        <Field
          name="customerAddress"
          label="Adresse de livraison"
          autoComplete="street-address"
          placeholder="Lot II M 15 Tsaralalana, Antananarivo"
          multiline
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-muted text-xs font-medium">
            Mode de paiement
          </span>
          <select
            name="paymentMethod"
            required
            defaultValue={PAYMENT_METHODS[0].value}
            className="border-line-strong text-ink focus:border-brand rounded-[9px] border-[1.5px] bg-white px-3.5 py-2.5 text-sm outline-none"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="text-brand mt-3 text-[13px] font-medium">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand hover:bg-brand-dark font-display mt-5 w-full rounded-[10px] py-4 text-[15.5px] font-bold text-white disabled:opacity-50"
      >
        {pending ? "Envoi…" : "Passer la commande"}
      </button>

      <p className="text-muted mt-3 text-center text-xs">
        Paiement a la livraison ou Mvola / Orange Money
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  multiline = false,
  ...input
}: {
  name: string;
  label: string;
  multiline?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const className =
    "border-line-strong text-ink focus:border-brand rounded-[9px] border-[1.5px] bg-white px-3.5 py-2.5 text-sm outline-none";

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-muted text-xs font-medium">{label}</span>
      {multiline ? (
        <textarea name={name} required rows={3} className={className} placeholder={input.placeholder} />
      ) : (
        <input name={name} required className={className} {...input} />
      )}
    </label>
  );
}
