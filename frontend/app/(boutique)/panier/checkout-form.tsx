"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, createOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSessionId, notifyCartUpdated } from "@/lib/session";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";

const LOGIN_HREF = `/connexion?next=${encodeURIComponent("/panier")}`;

export function CheckoutForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      // `userId` n'est pas envoye : le backend le lit sur le JWT.
      const order = await createOrder({
        session_id: getSessionId(),
        shippingName: String(form.get("shippingName") ?? "").trim(),
        shippingPhone: String(form.get("shippingPhone") ?? "").trim(),
        shippingAddress: String(form.get("shippingAddress") ?? "").trim(),
        paymentMethod: form.get("paymentMethod") as PaymentMethod,
      });

      // Le backend vide le panier a la creation de la commande.
      notifyCartUpdated();
      router.push(`/commande/${order.id}`);
    } catch (submitError) {
      // Token expire pendant que la page etait ouverte : on renvoie se
      // reconnecter plutot que d'afficher un « Unauthorized » brut.
      if (submitError instanceof ApiError && submitError.status === 401) {
        router.push(LOGIN_HREF);
        return;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "La commande n'a pas pu etre enregistree",
      );
      setPending(false);
    }
  }

  // Avant hydratation on ne sait pas encore si le visiteur est connecte.
  if (user === undefined) {
    return (
      <div className="border-line mt-4 border-t pt-5">
        <p className="text-muted text-sm">Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border-line mt-4 border-t pt-5">
        <h3 className="font-display text-navy text-[15px] font-bold">
          Connectez-vous pour commander
        </h3>
        <p className="text-muted mt-2 text-[13px]">
          Votre panier est conservé : vous le retrouverez juste après.
        </p>
        <Link
          href={LOGIN_HREF}
          className="bg-brand hover:bg-brand-dark font-display mt-4 block rounded-[10px] py-3.5 text-center text-[15px] font-bold text-white"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border-line mt-4 border-t pt-5">
      <h3 className="font-display text-navy mb-1 text-[15px] font-bold">
        Adresse de livraison
      </h3>
      {/* Prerempli depuis le profil, mais modifiable : une commande peut etre
          livree ailleurs, et le backend fige ces valeurs sur la commande. */}
      <p className="text-muted mb-4 text-xs">
        Pré-remplie depuis votre compte, modifiable pour cette commande.
      </p>

      <div className="flex flex-col gap-3">
        <Field
          name="shippingName"
          label="Nom complet"
          autoComplete="name"
          placeholder="Rakoto Andrianina"
          defaultValue={user.fullName}
        />
        <Field
          name="shippingPhone"
          label="Telephone"
          type="tel"
          autoComplete="tel"
          placeholder="+261 32 00 000 00"
          defaultValue={user.phone ?? ""}
        />
        <Field
          name="shippingAddress"
          label="Adresse de livraison"
          autoComplete="street-address"
          placeholder="Lot II M 15 Tsaralalana, Antananarivo"
          defaultValue={user.address ?? ""}
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
        <textarea
          name={name}
          required
          rows={3}
          className={className}
          placeholder={input.placeholder}
          defaultValue={input.defaultValue as string | undefined}
        />
      ) : (
        <input name={name} required className={className} {...input} />
      )}
    </label>
  );
}
