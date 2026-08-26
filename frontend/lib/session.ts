"use client";

/**
 * Le backend n'a pas d'authentification : un visiteur est identifie par un
 * `session_id` genere ici et conserve en localStorage. Le panier cote serveur
 * est rattache a cet identifiant (`GET /cart?session_id=`).
 */
const STORAGE_KEY = "futurama.session_id";

/** Evenement interne : previent le badge du header qu'il doit se rafraichir. */
export const CART_UPDATED_EVENT = "futurama:cart-updated";

export function getSessionId(): string {
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, sessionId);

  return sessionId;
}

export function notifyCartUpdated(): void {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
