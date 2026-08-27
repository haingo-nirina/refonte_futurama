import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Votre panier" };

export default function CartPage() {
  // Le panier depend du `session_id` en localStorage : tout est rendu cote
  // client, le serveur ne sait pas a quel visiteur il a affaire.
  return <CartView />;
}
