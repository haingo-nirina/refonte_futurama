import type {
  Cart,
  Category,
  CreateOrderInput,
  Order,
  Paginated,
  Product,
  ProductDetail,
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    // Catalogue, panier et commandes doivent refleter la base a chaque rendu :
    // sans ca, Next prerendrait ces pages au build avec des donnees figees.
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
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

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
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

export function getOrder(id: string): Promise<Order> {
  return request<Order>(`/orders/${id}`);
}
