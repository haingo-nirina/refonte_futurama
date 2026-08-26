/**
 * Formes renvoyees par l'API NestJS.
 *
 * Les colonnes monetaires sont des `Decimal` cote Prisma : elles arrivent en
 * JSON sous forme de **chaine** (`"450000"`), jamais de nombre. Tout ce qui les
 * manipule passe par `lib/format.ts`.
 */

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isFeatured: boolean;
  parent: { id: string; name: string; slug: string } | null;
  children: { id: string; name: string; slug: string }[];
};

export type ProductImage = {
  id: string;
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
};

export type ProductSpec = {
  id: string;
  label: string;
  value: string;
  displayOrder: number;
};

export type Product = {
  id: string;
  categoryId: string;
  vendorId: string | null;
  name: string;
  slug: string;
  reference: string | null;
  description: string | null;
  price: string;
  promoPrice: string | null;
  stock: number;
  isPremium: boolean;
  videoUrl: string | null;
  viewsCount: number;
  isActive: boolean;
  images: ProductImage[];
};

/** `GET /products/:id` enrichit la fiche avec ses caracteristiques. */
export type ProductDetail = Product & {
  specs: ProductSpec[];
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type CartItem = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  product: Product;
};

export type Cart = {
  id: string;
  sessionId: string;
  items: CartItem[];
};

export type OrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: string;
};

export type Order = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: PaymentMethod;
  status: string;
  subtotal: string;
  shippingFee: string;
  total: string;
  createdAt: string;
  items: OrderItem[];
};

/** Doit rester aligne sur `backend/src/common/constants.ts`. */
export const PAYMENT_METHODS = [
  { value: "cash_on_delivery", label: "Paiement a la livraison" },
  { value: "mvola", label: "Mvola" },
  { value: "orange_money", label: "Orange Money" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export type CreateOrderInput = {
  session_id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: PaymentMethod;
};
