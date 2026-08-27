"use client";

import { useEffect, useState } from "react";
import {
  clearTokenCookie,
  readTokenCookie,
  writeTokenCookie,
} from "./auth-token";
import type { AuthSession, AuthUser } from "./types";

/**
 * Le token est dans un cookie (voir `lib/auth-token.ts`) ; le profil affiche
 * — nom, telephone, adresse — reste en localStorage : il ne sert qu'a
 * l'interface et n'a aucune raison de repartir vers le serveur a chaque
 * requete.
 */
const USER_KEY = "futurama.user";

/** Evenement interne : previent le header qu'il doit se rafraichir. */
export const AUTH_CHANGED_EVENT = "futurama:auth-changed";

export function getToken(): string | undefined {
  return readTokenCookie();
}

export function getStoredUser(): AuthUser | null {
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function startSession(session: AuthSession): void {
  writeTokenCookie(session.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  notifyAuthChanged();
}

export function endSession(): void {
  clearTokenCookie();
  window.localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

export function notifyAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/**
 * `undefined` tant que l'hydratation n'a pas eu lieu : ni le cookie ni le
 * localStorage ne sont lisibles au premier rendu client, et afficher un etat
 * devine creerait un ecart avec le HTML serveur. Meme convention que
 * `CartBadge`.
 */
export function useAuth(): { user: AuthUser | null | undefined } {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    function sync() {
      // Sans cookie il n'y a plus de session, meme si le profil traine encore.
      setUser(readTokenCookie() ? getStoredUser() : null);
    }

    sync();
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    // Deconnexion depuis un autre onglet.
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { user };
}

/**
 * Empeche `?next=` de servir de redirection ouverte : seules les routes
 * internes sont acceptees.
 */
export function safeNextPath(value: string | undefined, fallback = "/"): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;

  return value;
}
