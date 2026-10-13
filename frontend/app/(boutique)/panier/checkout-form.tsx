"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/admin/modal";
import { ApiError, createOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  addBusinessDays,
  formatDeliveryDate,
  formatMgPhone,
  isValidMvolaPhone,
  normalizeMgPhone,
  shippingFeeFor,
  storeDirectionsUrl,
  storeMapEmbedUrl,
} from "@/lib/checkout";
import { formatPrice, toAmount } from "@/lib/format";
import { getSessionId, notifyCartUpdated } from "@/lib/session";
import type {
  AuthUser,
  CartItem,
  DeliveryZone,
  FulfillmentMethod,
  Store,
} from "@/lib/types";

const LOGIN_HREF = `/connexion?next=${encodeURIComponent("/panier")}`;

const INPUT =
  "border-line-strong text-ink focus:border-brand w-full rounded-[9px] border-[1.5px] bg-white px-3.5 py-2.5 text-sm outline-none";

type Props = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  zones: DeliveryZone[];
  stores: Store[];
};

/**
 * Colonne « Récapitulatif » du panier : mode de réception, contact, lieu,
 * paiement MVola, totaux, puis popup de confirmation avant `POST /orders`.
 *
 * Les montants affichés ici sont une annonce : le backend recalcule prix,
 * frais de livraison et stock à la commande, et c'est lui qui fait foi.
 */
export function CheckoutForm(props: Props) {
  const { user } = useAuth();

  // Avant hydratation on ne sait pas encore si le visiteur est connecté.
  if (user === undefined) {
    return <p className="text-muted text-sm">Chargement…</p>;
  }

  // `key` : les champs se préremplissent une fois, depuis le compte connecté.
  return <Checkout key={user?.id ?? "visiteur"} user={user} {...props} />;
}

function Checkout({
  user,
  items,
  subtotal,
  itemCount,
  zones,
  stores,
}: Props & { user: AuthUser | null }) {
  const router = useRouter();
  const store = stores[0] ?? null;

  const [method, setMethod] = useState<FulfillmentMethod>("LIVRAISON");
  const [contactName, setContactName] = useState(user?.fullName ?? "");
  const [contactPhone, setContactPhone] = useState(user?.phone ?? "");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  // Le numéro MVola suit le téléphone du contact tant qu'on ne l'a pas modifié.
  const [mvolaPhone, setMvolaPhone] = useState<string | null>(null);
  const [mvolaError, setMvolaError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDelivery = method === "LIVRAISON";
  const zone = zones.find((entry) => entry.id === zoneId) ?? null;
  const shippingFee = isDelivery && zone ? shippingFeeFor(zone, subtotal) : 0;
  const total = subtotal + shippingFee;
  const payer = mvolaPhone ?? contactPhone;
  const expectedDelivery =
    isDelivery && zone ? addBusinessDays(new Date(), zone.delayDays) : null;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidMvolaPhone(payer)) {
      setMvolaError("Numéro MVola invalide : 034 ou 038 suivi de 7 chiffres.");
      return;
    }

    setMvolaError(null);
    setError(null);
    setConfirming(true);
  }

  async function onConfirm() {
    setPending(true);
    setError(null);

    try {
      // Ni `userId` ni montant : le backend lit le compte sur le JWT et
      // recalcule tous les prix.
      const order = await createOrder({
        session_id: getSessionId(),
        fulfillmentMethod: method,
        contactName: contactName.trim(),
        contactPhone: normalizeMgPhone(contactPhone),
        ...(isDelivery
          ? { deliveryZoneId: zoneId, shippingAddress: address.trim() }
          : { storeId: store?.id }),
        paymentMethod: "MVOLA",
        mvolaPhone: normalizeMgPhone(payer),
      });

      // Le backend vide le panier à la création de la commande.
      notifyCartUpdated();
      router.push(`/commande/${order.id}`);
    } catch (submitError) {
      // Token expiré pendant que la page était ouverte : on renvoie se
      // reconnecter plutôt que d'afficher un « Unauthorized » brut.
      if (submitError instanceof ApiError && submitError.status === 401) {
        router.push(LOGIN_HREF);
        return;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "La commande n'a pas pu être enregistrée",
      );
      setPending(false);
    }
  }

  const shippingLabel = isDelivery
    ? `Livraison${zone ? ` · ${zone.name}` : ""}`
    : "Retrait en boutique";
  const shippingValue = !isDelivery ? (
    <span className="text-success font-medium">Gratuit</span>
  ) : shippingFee === 0 && zone ? (
    <span className="text-success font-medium">Offerte</span>
  ) : (
    <span className="text-ink font-medium">
      {zone ? formatPrice(shippingFee) : "—"}
    </span>
  );

  return (
    <form onSubmit={onSubmit}>
      {/* --------------------------------------------- Mode de réception */}
      <p className="text-ink mb-2.5 text-[12.5px] font-semibold">
        Comment recevoir votre commande ?
      </p>
      <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
        <MethodCard
          selected={isDelivery}
          onSelect={() => setMethod("LIVRAISON")}
          icon={<TruckIcon />}
          title="Me faire livrer"
          subtitle="À l'adresse de votre choix"
        />
        <MethodCard
          selected={!isDelivery}
          onSelect={() => setMethod("RETRAIT_BOUTIQUE")}
          icon={<StoreIcon />}
          title="Récupérer en boutique"
          subtitle={
            store
              ? `${storeArea(store)} · gratuit`
              : "Indisponible pour le moment"
          }
          disabled={!store}
        />
      </div>

      {user ? (
        <>
          {/* --------------------------------------------------- Contact */}
          <Section title="Contact">
            <Field label="Nom complet">
              <input
                required
                autoComplete="name"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Téléphone">
              <input
                required
                type="tel"
                autoComplete="tel"
                placeholder="034 00 000 00"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className={INPUT}
              />
            </Field>
          </Section>
        </>
      ) : null}

      {/* ------------------------------------------------------ Lieu */}
      {isDelivery ? (
        <Section title="Lieu de livraison">
          {zones.length === 0 ? (
            <p className="text-brand text-[13px]">
              Aucune zone de livraison disponible pour le moment.
            </p>
          ) : (
            <Field label="Zone">
              <select
                required
                value={zoneId}
                onChange={(event) => setZoneId(event.target.value)}
                className={INPUT}
              >
                {zones.map((entry) => {
                  const fee = shippingFeeFor(entry, subtotal);
                  return (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} — {fee === 0 ? "Offerte" : formatPrice(fee)}
                    </option>
                  );
                })}
              </select>
            </Field>
          )}
          {user ? (
            <Field
              label="Adresse précise"
              hint="Lot, quartier et un point de repère pour le livreur"
            >
              <textarea
                required
                rows={3}
                autoComplete="street-address"
                placeholder="Lot II M 15, Tsaralalana, face pharmacie"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className={INPUT}
              />
            </Field>
          ) : null}
        </Section>
      ) : store ? (
        <Section title="Lieu de retrait">
          <StoreCard store={store} />
          <p className="bg-tint-cool text-tint-cool-ink rounded-[10px] px-3.5 py-3 text-[12.5px]">
            Vous recevrez un SMS avec votre code de retrait dès que la commande
            sera prête.
          </p>
        </Section>
      ) : null}

      {/* -------------------------------------------------- Paiement */}
      {user ? (
        <Section title="Paiement">
          <div className="border-navy flex items-center gap-3 rounded-[10px] border-[1.5px] bg-white px-3.5 py-3">
            <MvolaBadge />
            <div>
              <p className="text-ink text-[13.5px] font-semibold">MVola</p>
              <p className="text-muted text-xs">
                {isDelivery
                  ? "Vous validerez sur votre téléphone"
                  : "Payez maintenant, récupérez sans attendre"}
              </p>
            </div>
          </div>
          <Field label="Numéro MVola qui paie" error={mvolaError}>
            <input
              required
              type="tel"
              inputMode="tel"
              placeholder="034 00 000 00"
              value={payer}
              onChange={(event) => {
                setMvolaPhone(event.target.value);
                setMvolaError(null);
              }}
              onBlur={() => {
                if (payer && !isValidMvolaPhone(payer)) {
                  setMvolaError(
                    "Numéro MVola invalide : 034 ou 038 suivi de 7 chiffres.",
                  );
                }
              }}
              aria-invalid={mvolaError ? true : undefined}
              className={`${INPUT} ${mvolaError ? "border-brand" : ""}`}
            />
          </Field>
        </Section>
      ) : null}

      {/* ---------------------------------------------------- Totaux */}
      <div className="border-line mt-5 border-t pt-4">
        <Row
          label={`Sous-total (${itemCount} article${itemCount > 1 ? "s" : ""})`}
          value={
            <span className="text-ink font-medium">
              {formatPrice(subtotal)}
            </span>
          }
        />
        <Row label={shippingLabel} value={shippingValue} />
        <div className="border-line mt-2 flex items-baseline justify-between border-t pt-4">
          <span className="font-display text-navy text-base font-bold">
            Total
          </span>
          <span className="font-display text-navy text-[22px] font-extrabold tracking-tight">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {user ? (
        <>
          <button
            type="submit"
            disabled={isDelivery ? !zone : !store}
            className="bg-brand hover:bg-brand-dark font-display mt-5 w-full rounded-[10px] py-4 text-[15.5px] font-bold text-white disabled:opacity-50"
          >
            Passer la commande
          </button>
          <p className="text-muted mt-3 text-center text-xs">
            Une fenêtre de confirmation s&apos;ouvrira avant le paiement
          </p>
        </>
      ) : (
        <div className="border-line mt-5 border-t pt-5">
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
      )}

      {/* ----------------------------------------- Popup de confirmation */}
      <Modal
        open={confirming}
        onClose={() => {
          if (!pending) setConfirming(false);
        }}
        title="Confirmez votre commande"
        description="Vérifiez les informations avant de payer"
        width="480px"
      >
        <Label>Articles</Label>
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-4 text-[13px]"
            >
              <span className="text-ink">
                {item.product.name} × {item.quantity}
              </span>
              <span className="text-ink flex-none">
                {formatPrice(toAmount(item.unitPrice) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-line mt-4 grid grid-cols-2 gap-x-5 gap-y-4 border-t pt-4 text-[13px]">
          {isDelivery ? (
            <Summary title="Livraison">
              <p>{address.trim()}</p>
              <p>{zone?.name}</p>
            </Summary>
          ) : (
            <Summary title="Retrait en boutique">
              <p>{store?.name}</p>
              <p>{store?.address}</p>
            </Summary>
          )}
          <Summary title="Contact">
            <p>{contactName.trim()}</p>
            <p>{formatMgPhone(contactPhone)}</p>
          </Summary>
          <Summary title="Paiement">
            <p>MVola</p>
            <p>{formatMgPhone(payer)}</p>
          </Summary>
          {isDelivery ? (
            <Summary title="Livraison prévue">
              <p>
                {expectedDelivery ? formatDeliveryDate(expectedDelivery) : "—"}
              </p>
            </Summary>
          ) : (
            <Summary title="Horaires">
              <p className="whitespace-pre-line">{store?.openingHours}</p>
            </Summary>
          )}
        </div>

        <div className="border-line mt-4 border-t pt-4">
          <Row
            label="Sous-total"
            value={<span className="text-ink">{formatPrice(subtotal)}</span>}
          />
          <Row
            label={isDelivery ? "Livraison" : "Retrait en boutique"}
            value={
              shippingFee === 0 ? (
                <span className="text-success">
                  {isDelivery ? "Offerte" : "Gratuit"}
                </span>
              ) : (
                <span className="text-ink">{formatPrice(shippingFee)}</span>
              )
            }
          />
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-navy text-[15px] font-bold">
              Total à payer
            </span>
            <span className="font-display text-navy text-[22px] font-extrabold tracking-tight">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        <p className="bg-mvola-soft text-mvola-ink mt-4 flex gap-2.5 rounded-[10px] px-3.5 py-3 text-[12.5px]">
          <PhoneIcon />
          <span>
            Après confirmation, une demande MVola arrive sur le{" "}
            <strong>{formatMgPhone(payer)}</strong>. Validez-la avec votre code
            secret.
          </span>
        </p>

        {error ? (
          <p className="text-brand mt-3 text-[13px] font-medium">{error}</p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="border-line-strong text-navy hover:bg-cream-deep rounded-[10px] border-[1.5px] bg-white py-3 text-[14px] font-semibold disabled:opacity-50"
          >
            Modifier
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="bg-brand hover:bg-brand-dark font-display rounded-[10px] py-3 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {pending ? "Envoi…" : "Confirmer et payer"}
          </button>
        </div>
      </Modal>
    </form>
  );
}

/** « Futurama.mg Analakely » → « Analakely » : le quartier, pour la carte de choix. */
function storeArea(store: Store): string {
  return store.name.replace(/^futurama(\.mg)?\s*/i, "") || store.name;
}

function MethodCard({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex flex-col items-start gap-1.5 rounded-[10px] border-[1.5px] px-3 py-3 text-left transition disabled:opacity-50 ${
        selected
          ? "border-brand bg-tint-warm text-brand"
          : "border-line-strong text-ink bg-white hover:border-muted-light"
      }`}
    >
      <span className={selected ? "text-brand" : "text-muted"}>{icon}</span>
      <span className="text-[13px] leading-tight font-semibold">{title}</span>
      <span className="text-muted text-[11px] leading-tight">{subtitle}</span>
    </button>
  );
}

function StoreCard({ store }: { store: Store }) {
  return (
    <div className="border-line overflow-hidden rounded-[10px] border bg-white">
      <iframe
        title={`Carte : ${store.name}`}
        src={storeMapEmbedUrl(store)}
        className="block h-[150px] w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="space-y-1 px-3.5 py-3 text-[12.5px]">
        <p className="text-navy text-[13.5px] font-bold">{store.name}</p>
        <p className="text-muted">{store.address}</p>
        <p className="text-muted whitespace-pre-line">
          Ouvert : {store.openingHours}
        </p>
        <p className="text-muted">Tél. : {store.phone}</p>
        <a
          href={storeDirectionsUrl(store)}
          target="_blank"
          rel="noreferrer"
          className="text-brand inline-block pt-1 font-semibold underline underline-offset-2"
        >
          Ouvrir l&apos;itinéraire
        </a>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-line mt-5 border-t pt-4">
      <h3 className="font-display text-navy mb-3 text-[14.5px] font-bold">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-muted text-xs font-medium">{label}</span>
      {children}
      {error ? (
        <span className="text-brand text-xs font-medium">{error}</span>
      ) : hint ? (
        <span className="text-muted-light text-[11.5px]">{hint}</span>
      ) : null}
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-muted flex justify-between gap-4 py-1.5 text-[13px]">
      <span>{label}</span>
      {value}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted text-[10.5px] font-bold tracking-[0.08em] uppercase">
      {children}
    </p>
  );
}

function Summary({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{title}</Label>
      <div className="text-ink mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

function MvolaBadge() {
  return (
    <span className="bg-mvola text-mvola-ink flex size-9 flex-none items-center justify-center rounded-[8px] text-[11px] font-extrabold">
      MV
    </span>
  );
}

function TruckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h11v9H3z" />
      <path d="M14 9h4l3 3v3h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9.5 5.5 4h13L20 9.5" />
      <path d="M4 9.5h16v1a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 13.5a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 10.5z" />
      <path d="M5.5 13v7h13v-7" />
      <path d="M10 20v-4h4v4" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 flex-none"
    >
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}
