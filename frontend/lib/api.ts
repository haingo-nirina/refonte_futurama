import { readTokenCookie } from "./auth-token";
import type {
  AuthSession,
  AuthUser,
  Cart,
  Category,
  CreateOrderInput,
  LoginInput,
  Order,
  Paginated,
  Product,
  ProductDetail,
  RegisterInput,
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

export function toQuery(params: Record<string, string | number | undefined>): string {
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

// ------------------------------------------------------------------ Produits

export type ProductsQuery = {
  categoryId?: string;
  vendorId?: string;
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

export function getProduct(id: string): Promise<ProductDetail> {
  return request<ProductDetail>(`/products/${id}`);
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
