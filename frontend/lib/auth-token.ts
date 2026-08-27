/**
 * Le token vit dans un cookie et non en localStorage : la page de confirmation
 * de commande est un Server Component et doit pouvoir l'envoyer a une route
 * protegee pendant le rendu, ce que localStorage ne permet pas.
 *
 * Il n'est pas `httpOnly` — meme exposition qu'un localStorage face au XSS —
 * mais il devient lisible cote serveur, ce qui est tout l'interet ici.
 *
 * Ce module ne porte volontairement pas de directive `use client` : il est
 * partage par `lib/api.ts` (rendu des deux cotes) et `lib/auth.ts`.
 */
export const TOKEN_COOKIE = "futurama.token";

/** Aligne sur `JWT_EXPIRES_IN` cote backend (7 j par defaut). */
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function readTokenCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : undefined;
}

export function writeTokenCookie(token: string): void {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function clearTokenCookie(): void {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
