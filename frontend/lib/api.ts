import { readTokenCookie } from "./auth-token";
import type {
  AuthSession,
  AuthUser,
  Cart,
  Category,
  CreateOrderInput,
  MarqueDetail,
  LoginInput,
  Order,
  Paginated,
  Post,
  PostComment,
  Product,
  ProductDetail,
  ProductReview,
  Promotion,
  RegisterInput,
  ReviewInput,
  ReviewUpdateInput,
} from "./types";

/**
 * Une seule porte d'entree vers l'API NestJS : aucun `fetch` ne doit etre
 * disperse dans les composants.
 *
 * L'URL de base depend du cote ou tourne le code :
 * - serveur (Server Components) : on tape directement le backend, le rewrite
 *   Next ne s'applique qu'au trafic navigateur ;
 * - navigateur : on passe par `/api`, monte sur le backend dans
 *   `next.config.ts`. Same-origin, donc pas de CORS a activer cote Nest.
 */
const BASE_URL =
  typeof window === "undefined"
    ? (process.env.BACKEND_URL ?? "http://localhost:3001")
    : "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * `token` n'est a fournir que cote serveur, ou le cookie n'est pas lisible
 * depuis ce module : un Server Component passe `await getServerToken()`.
 * Dans le navigateur, le token est trouve tout seul.
 */
export type RequestInitWithAuth = RequestInit & { token?: string };

export async function request<T>(
  path: string,
  init?: RequestInitWithAuth,
): Promise<T> {
  const { token, ...fetchInit } = init ?? {};
  const bearer = token ?? readTokenCookie();

  const response = await fetch(`${BASE_URL}${path}`, {
    // Catalogue, panier et commandes doivent refleter la base a chaque rendu :
    // sans ca, Next prerendrait ces pages au build avec des donnees figees.
    cache: "no-store",
    ...fetchInit,
    headers: {
      // Un FormData porte une frontiere multipart generee a l'envoi : imposer
      // un Content-Type la ferait disparaitre et le serveur ne saurait plus
      // decouper le corps.
      ...(fetchInit.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...fetchInit.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

/** Nest renvoie `{ message: string | string[] }` sur ses erreurs de validation. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = (body as { message?: unknown }).message;

    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  } catch {
    // Reponse non-JSON : on retombe sur le statut HTTP.
  }

  return `Erreur ${response.status}`;
}

export function toQuery(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

// --------------------------------------------------------------------- Auth

export function register(input: RegisterInput): Promise<AuthSession> {
  return request<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput): Promise<AuthSession> {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Profil relu en base ; c'est ce qui autorise l'entree du backoffice. */
export function getMe(token?: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", { token });
}

// ---------------------------------------------------------------- Categories

export function getCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

// ------------------------------------------------------------------ Marques

/** Lecture publique, comme les categories : le catalogue s'en sert aussi. */
export function getMarques(): Promise<MarqueDetail[]> {
  return request<MarqueDetail[]>("/marques");
}

// ------------------------------------------------------------------ Produits

export type ProductsQuery = {
  categoryId?: string;
  marqueId?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
};

export function getProducts(
  query: ProductsQuery = {},
): Promise<Paginated<Product>> {
  return request<Paginated<Product>>(`/products${toQuery(query)}`);
}

/**
 * La section « Derniers produits » de l'accueil.
 *
 * `GET /products` trie deja par `createdAt` decroissant et masque les produits
 * depublies : demander la premiere page suffit. Le tri est malgre tout
 * reapplique ici — la recence est le contrat de cette section, pas un effet de
 * bord de l'`orderBy` du backend, qui sert aussi la liste du backoffice et
 * pourrait changer.
 *
 * Le classement se fait sur `createdAt`, jamais sur `updatedAt` : modifier un
 * vieux produit ne doit pas le renvoyer en nouveaute.
 *
 * Un produit cree depuis le backoffice apparait donc au rendu suivant — les
 * lectures sont en `cache: "no-store"`.
 */
export async function getLatestProducts(limit = 4): Promise<Product[]> {
  const { data } = await getProducts({ page: 1, limit });

  return [...data].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

/**
 * La section « Le plus consulte » de l'accueil.
 *
 * Le classement vient du backend (`viewsCount` decroissant, produits publies
 * uniquement) : il n'y a rien a retrier ici, contrairement aux nouveautes ou
 * la recence est le contrat de la section.
 */
export function getMostViewedProducts(limit = 4): Promise<Product[]> {
  return request<Product[]>(`/products/most-viewed${toQuery({ limit })}`);
}

export function getProduct(id: string): Promise<ProductDetail> {
  return request<ProductDetail>(`/products/${id}`);
}

// ---------------------------------------------------------------- Promotions

/**
 * La section « Promotion du mois » de l'accueil. Le backend ne renvoie que les
 * promotions marquees, actives, dans leur fenetre de dates, et dont le produit
 * est publie : rien a refiltrer ici.
 */
export function getFeaturedPromotions(): Promise<Promotion[]> {
  return request<Promotion[]>("/products/featured-promotion");
}

/** Promotion en cours sur un produit, ou `null`. */
export function getActivePromotion(
  productId: string,
): Promise<Promotion | null> {
  return request<Promotion | null>(`/products/${productId}/active-promotion`);
}

// ---------------------------------------------------------------------- Avis

/**
 * `GET /products/:id` porte deja les avis du produit : seul le depot passe par
 * ici. L'avis est publie directement, la liste rendue cote serveur doit donc
 * etre relue apres l'appel.
 */
export function createReview(input: ReviewInput): Promise<ProductReview> {
  return request<ProductReview>("/reviews", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Modification et suppression sont reservees a l'auteur : le backend refuse
 * en 403 l'avis d'un autre compte, le backoffice n'y touche pas.
 */
export function updateReview(
  id: string,
  input: ReviewUpdateInput,
): Promise<ProductReview> {
  return request<ProductReview>(`/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteReview(id: string): Promise<ProductReview> {
  return request<ProductReview>(`/reviews/${id}`, { method: "DELETE" });
}

// -------------------------------------------------------------------- Panier

export function getCart(sessionId: string): Promise<Cart> {
  return request<Cart>(`/cart${toQuery({ session_id: sessionId })}`);
}

export function addCartItem(
  sessionId: string,
  productId: string,
  quantity: number,
): Promise<Cart> {
  return request<Cart>(`/cart/items${toQuery({ session_id: sessionId })}`, {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
}

// ----------------------------------------------------------------- Commandes

export function createOrder(input: CreateOrderInput): Promise<Order> {
  return request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getOrder(id: string, token?: string): Promise<Order> {
  return request<Order>(`/orders/${id}`, { token });
}

/** Historique du compte appelant ; la totalite du site pour un admin. */
export function getMyOrders(token?: string): Promise<Order[]> {
  return request<Order[]>("/orders", { token });
}

// ------------------------------------------------------------- Publications

/**
 * Le mur de la boutique. Le backend classe du plus recent au plus ancien sur
 * `publishedAt` — la date que le mur affiche — et masque brouillons et
 * publications programmees.
 *
 * `token` n'est utile que depuis un Server Component : sans lui la reponse
 * revient avec `liked: false`, le backend n'ayant aucun lecteur a qui
 * rattacher les « j'aime ».
 */
export function getPosts(
  query: { page?: number; limit?: number } = {},
  token?: string,
): Promise<Paginated<Post>> {
  return request<Paginated<Post>>(`/posts${toQuery(query)}`, { token });
}

/**
 * Les deux sens du « j'aime », idempotents cote backend : liker deux fois ne
 * compte qu'une. Ils renvoient la publication a jour, compteur compris.
 */
export function likePost(id: string): Promise<Post> {
  return request<Post>(`/posts/${id}/like`, { method: "POST" });
}

export function unlikePost(id: string): Promise<Post> {
  return request<Post>(`/posts/${id}/like`, { method: "DELETE" });
}

/** L'auteur n'est pas dans le corps : le backend le lit sur le JWT. */
export function commentPost(
  id: string,
  comment: string,
): Promise<PostComment> {
  return request<PostComment>(`/posts/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

/**
 * Modifier son commentaire. Reserve a son auteur — le backend compare au JWT
 * et repond 403 sinon, sans exception pour l'admin : moderer, c'est retirer,
 * pas reecrire au nom de quelqu'un.
 */
export function updatePostComment(
  postId: string,
  commentId: string,
  comment: string,
): Promise<PostComment> {
  return request<PostComment>(`/posts/${postId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ comment }),
  });
}

/**
 * Retrait d'un commentaire. Deux appelants pour la meme route : son auteur
 * depuis le mur, l'admin depuis le backoffice au titre de la moderation. Elle
 * ne vit donc pas dans `admin-api.ts`, qui ne regroupe que l'interdit au
 * client.
 */
export function deletePostComment(
  postId: string,
  commentId: string,
): Promise<PostComment> {
  return request<PostComment>(`/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}
