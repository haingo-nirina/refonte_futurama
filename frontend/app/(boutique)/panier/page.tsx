import type { Metadata } from "next";
import { getDeliveryZones, getStores } from "@/lib/api";
import type { DeliveryZone, Store } from "@/lib/types";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Votre panier" };

export default async function CartPage() {
  // Zones et boutiques ne dependent pas du visiteur : lues au rendu serveur.
  // Le panier, lui, depend du `session_id` en localStorage et reste client.
  const [zones, stores] = await Promise.all([
    getDeliveryZones().catch((): DeliveryZone[] => []),
    getStores().catch((): Store[] => []),
  ]);

  return <CartView zones={zones} stores={stores} />;
}
