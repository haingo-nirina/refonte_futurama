import { request, toQuery } from "./api";
import type {
  AdminOrder,
  AdminProduct,
  AdminProductDetail,
  AdminReview,
  Category,
  CategoryInput,
  DashboardStats,
  ModerationStatus,
  OrderStatus,
  Paginated,
  ProductImage,
  ProductInput,
  ProductRelation,
  ProductSpec,
  RelationType,
} from "./types";

/**
 * Appels reserves au backoffice. Ils partagent le `request()` de `lib/api.ts`
 * — une seule implementation de `fetch` — mais vivent a part : ces routes
 * repondent toutes 403 a un compte client, et rien ici ne doit finir par etre
 * appele depuis une page de la boutique.
 *
 * Comme cote boutique, `token` n'est a fournir que depuis un Server Component
 * (`await getServerToken()`) ; dans le navigateur le cookie est trouve seul.
 */

// ------------------------------------------------------------ Tableau de bord

export function getDashboard(token?: string): Promise<DashboardStats> {
  return request<DashboardStats>("/stats/dashboard", { token });
}

// ---------------------------------------------------------------- Commandes

export type AdminOrdersQuery = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function getAdminOrders(
  query: AdminOrdersQuery = {},
  token?: string,
): Promise<Paginated<AdminOrder>> {
  return request<Paginated<AdminOrder>>(`/orders/admin${toQuery(query)}`, {
    token,
  });
}

export function getAdminOrder(
  id: string,
  token?: string,
): Promise<AdminOrder> {
  return request<AdminOrder>(`/orders/${id}`, { token });
}

export function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<AdminOrder> {
  return request<AdminOrder>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ----------------------------------------------------------------- Produits

export type AdminProductsQuery = {
  page?: number;
  limit?: number;
  categoryId?: string;
  q?: string;
  /** Non fourni = actifs et inactifs melanges (le defaut du backoffice). */
  isActive?: boolean;
};

export function getAdminProducts(
  query: AdminProductsQuery = {},
  token?: string,
): Promise<Paginated<AdminProduct>> {
  const { isActive, ...rest } = query;

  return request<Paginated<AdminProduct>>(
    `/products${toQuery({
      ...rest,
      isActive: isActive === undefined ? undefined : String(isActive),
    })}`,
    { token },
  );
}

export function getAdminProduct(
  id: string,
  token?: string,
): Promise<AdminProductDetail> {
  return request<AdminProductDetail>(`/products/${id}`, { token });
}

export function createProduct(input: ProductInput): Promise<AdminProduct> {
  return request<AdminProduct>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<AdminProduct> {
  return request<AdminProduct>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProduct(id: string): Promise<AdminProduct> {
  return request<AdminProduct>(`/products/${id}`, { method: "DELETE" });
}

/** Galerie, specs et relations se remplacent en bloc : voir le backend. */
export function replaceProductImages(
  id: string,
  images: { imageUrl: string; isPrimary?: boolean }[],
): Promise<ProductImage[]> {
  return request<ProductImage[]>(`/products/${id}/images`, {
    method: "PUT",
    body: JSON.stringify({ images }),
  });
}

export function replaceProductSpecs(
  id: string,
  specs: { label: string; value: string }[],
): Promise<ProductSpec[]> {
  return request<ProductSpec[]>(`/products/${id}/specs`, {
    method: "PUT",
    body: JSON.stringify({ specs }),
  });
}

export function replaceProductRelations(
  id: string,
  relations: { relatedProductId: string; relationType: RelationType }[],
): Promise<ProductRelation[]> {
  return request<ProductRelation[]>(`/products/${id}/relations`, {
    method: "PUT",
    body: JSON.stringify({ relations }),
  });
}

// --------------------------------------------------------------- Categories

export function createCategory(input: CategoryInput): Promise<Category> {
  return request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCategory(
  id: string,
  input: Partial<CategoryInput>,
): Promise<Category> {
  return request<Category>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCategory(id: string): Promise<Category> {
  return request<Category>(`/categories/${id}`, { method: "DELETE" });
}

// --------------------------------------------------------------------- Avis

export type AdminReviewsQuery = {
  page?: number;
  limit?: number;
  status?: ModerationStatus;
  productId?: string;
};

export function getAdminReviews(
  query: AdminReviewsQuery = {},
  token?: string,
): Promise<Paginated<AdminReview>> {
  return request<Paginated<AdminReview>>(`/reviews/admin${toQuery(query)}`, {
    token,
  });
}

/** La moderation ne mene qu'a un etat terminal : jamais retour a `pending`. */
export function moderateReview(
  id: string,
  status: Exclude<ModerationStatus, "pending">,
): Promise<AdminReview> {
  return request<AdminReview>(`/reviews/${id}/moderate`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
