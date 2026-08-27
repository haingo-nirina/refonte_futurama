import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "./auth-token";

/**
 * Token du visiteur pendant un rendu serveur, a passer explicitement aux
 * fonctions de `lib/api.ts` qui tapent une route protegee.
 *
 * A n'importer que depuis un Server Component : `next/headers` n'existe pas
 * dans le bundle navigateur.
 */
export async function getServerToken(): Promise<string | undefined> {
  const store = await cookies();

  return store.get(TOKEN_COOKIE)?.value;
}
