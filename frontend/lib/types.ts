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
  marqueId: string | null;
  name: string;
  slug: string;
  reference: string | null;
  colors: string[];
  dimensions: string | null;
  description: string | null;
  price: string;
  stock: number;
  isPremium: boolean;
  videoUrl: string | null;
  viewsCount: number;
  isActive: boolean;
  images: ProductImage[];
  /**
   * Joint par `GET /products` (liste) uniquement : une lecture unitaire ou un
   * produit lie revient sans. C'est ce qui alimente la facette « Marques » du
   * catalogue.
   */
  marque?: Marque | null;
  /**
   * Jointe par `GET /products` (liste) uniquement, comme `marque` : c'est ce
   * qui donne son rayon a la carte « Derniers produits ».
   */
  category?: { id: string; name: string; slug: string };
  /**
   * Promotion en cours, calculee par le backend a chaque lecture — la seule
   * source du prix promo. `discountedPrice` est deja arrondi cote serveur : ne
   * jamais le recalculer ici, les arrondis divergeraient.
   */
  activePromotion: ActivePromotion | null;
  /**
   * Horodatages Prisma, serialises en ISO. `createdAt` est ce qui fait qu'un
   * produit est « recent » : c'est la cle de tri de `GET /products` et celle
   * de la section « Derniers produits ». `updatedAt` bouge a chaque
   * modification et ne doit donc **pas** servir a classer les nouveautes —
   * corriger le prix d'un produit de l'an dernier n'en refait pas une
   * nouveaute.
   */
  createdAt: string;
  updatedAt: string;
};

/** Le sous-ensemble de `Promotion` que portent les lectures produit. */
export type ActivePromotion = {
  id: string;
  titre: string | null;
  discountPercent: string;
  startDate: string;
  endDate: string;
  isFeatured: boolean;
  discountedPrice: string;
};

/** `GET /products/:id` enrichit la fiche avec ses caracteristiques. */
export type ProductDetail = Product & {
  specs: ProductSpec[];
  /** Les nouveaux avis sont publies directement ; le backend filtre malgre
   * tout sur `approved`, les avis anterieurs gardent leur statut. */
  reviews: ProductReview[];
};

/**
 * Promotion renvoyee par `GET /products/featured-promotion` et
 * `GET /products/:id/active-promotion`.
 *
 * `discountedPrice` est calcule cote serveur a chaque lecture : le prix promo
 * n'est jamais stocke sur le produit. Ne pas le recalculer ici, les arrondis
 * divergeraient de ce que le backend a applique.
 */
export type Promotion = {
  id: string;
  productId: string;
  titre: string | null;
  /** Pourcentage en chaine, comme les montants : `"25"`, `"12.5"`. */
  discountPercent: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFeatured: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    isActive: boolean;
    category: { id: string; name: string; slug: string };
    /** Reduite a la principale : la section n'affiche qu'un visuel. */
    images: ProductImage[];
  };
  basePrice: string;
  discountedPrice: string;
  savings: string;
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
  /** Numero lisible FUT-AAAA-000123 */
  number: string;
  userId: string;
  fulfillmentMethod: FulfillmentMethod;
  /** Contact et adresse de CETTE commande, figes : ils ne suivent pas le profil. */
  contactName: string;
  contactPhone: string;
  /** null en retrait boutique */
  shippingAddress: string | null;
  deliveryZoneName: string | null;
  deliveryDelayDays: number | null;
  store: Store | null;
  mvolaPhone: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** Renseigne au passage a PAYEE */
  paidAt: string | null;
  /** Date prevue de livraison ou de mise a disposition, fixee au paiement */
  expectedDeliveryAt: string | null;
  status: OrderStatus;
  subtotal: string;
  shippingFee: string;
  total: string;
  createdAt: string;
  items: OrderItem[];
};

/** Doit rester aligne sur `backend/src/common/constants.ts`. */
export const PAYMENT_METHODS = [
  { value: "MVOLA", label: "MVola" },
  // anciennes commandes uniquement : le backend refuse ce moyen a la creation
  { value: "CASH_ON_DELIVERY", label: "Paiement a la livraison" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

/**
 * Ni `userId` ni montant : le compte vient du JWT, les prix et les frais de
 * livraison sont recalcules par le backend depuis le catalogue et la zone.
 */
export type CreateOrderInput = {
  session_id: string;
  fulfillmentMethod: FulfillmentMethod;
  contactName: string;
  contactPhone: string;
  /** Livraison uniquement */
  deliveryZoneId?: string;
  shippingAddress?: string;
  /** Retrait uniquement */
  storeId?: string;
  paymentMethod: "MVOLA";
  mvolaPhone: string;
  /** Commande passee depuis la page live : mesure des ventes du live. */
  liveId?: string;
};

/** Zone de livraison (`GET /delivery-zones`) ; montants en chaine. */
export type DeliveryZone = {
  id: string;
  name: string;
  price: string;
  /** Jours ouvres */
  delayDays: number;
  freeThreshold: string | null;
};

/** Boutique de retrait (`GET /stores`). */
export type Store = {
  id: string;
  name: string;
  address: string;
  phone: string;
  /** Multi-lignes */
  openingHours: string;
  latitude: string | null;
  longitude: string | null;
  /** Jours ouvres avant que la commande soit prete : 0 = « En stock » */
  pickupDelayDays: number;
};

/** `GET /delivery-zones/admin` : desactivees comprises, avec leurs commandes. */
export type DeliveryZoneDetail = DeliveryZone & {
  isActive: boolean;
  displayOrder: number;
  _count: { orders: number };
};

/** Montants en nombre a l'envoi ; `freeThreshold: null` retire le seuil. */
export type DeliveryZoneInput = {
  name: string;
  price: number;
  delayDays: number;
  freeThreshold: number | null;
  isActive: boolean;
  displayOrder: number;
};

/** `GET /stores/admin` : desactivees comprises, avec leurs retraits. */
export type StoreDetail = Store & {
  isActive: boolean;
  _count: { orders: number };
};

/** `latitude` / `longitude` a `null` : la carte cherche l'adresse. */
export type StoreInput = {
  name: string;
  address: string;
  phone: string;
  openingHours: string;
  latitude: number | null;
  longitude: number | null;
  pickupDelayDays: number;
  isActive: boolean;
};

// ------------------------------------------------------------- Publications

/**
 * Un commentaire du mur. Le nom affiche vient du compte : `authorName`
 * n'existe plus, le backend joint toujours `user`.
 */
export type PostComment = {
  id: string;
  postId: string;
  comment: string;
  createdAt: string;
  user: { id: string; fullName: string };
  /** Non nul = reponse de la boutique au commentaire d'identifiant `parentId`. */
  parentId: string | null;
  /**
   * Les reponses de la boutique, jointes aux seules racines : le fil ne
   * descend qu'a un niveau. Absent sur une reponse.
   */
  replies?: PostComment[];
};

/**
 * Une publication du mur (`GET /posts`).
 *
 * Le backend joint les commentaires a la liste : le mur les affiche sous
 * chaque publication, sans second appel — meme parti que les avis sur la fiche
 * produit.
 */
export type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  photoUrl: string | null;
  viewsCount: number;
  likesCount: number;
  /** `null` = brouillon ; une date a venir = publication programmee. */
  publishedAt: string | null;
  createdAt: string;
  /** Les racines du fil ; les reponses de la boutique sont dans leur `replies`. */
  comments: PostComment[];
  /** `comments` compte les fils, pas les lignes : les reponses en sont exclues. */
  _count: { comments: number; likes: number };
  /**
   * Le compte appelant a-t-il deja aime. Toujours `false` pour un visiteur
   * anonyme : le backend ne joint les « j'aime » que du lecteur identifie, il
   * ne dit jamais qui a aime quoi.
   */
  liked: boolean;
};

/** `null` detache la photo ou repasse en brouillon ; `undefined` ne touche a rien. */
export type PostInput = {
  title: string;
  slug: string;
  content: string;
  photoUrl?: string | null;
  publishedAt?: string | null;
};

// --------------------------------------------------------------------- Auth

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  address: string | null;
  role: "customer" | "admin";
};

/** Reponse de `POST /auth/register` et `POST /auth/login`. */
export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  fullName: string;
  /** Optionnels cote backend, mais refuses s'ils sont vides : omettre plutot
   * qu'envoyer une chaine vide. */
  phone?: string;
  address?: string;
};

// --------------------------------------------------------------- Backoffice

/**
 * Formes propres au backoffice. Elles enrichissent les types publics plutot
 * que de les remplacer : c'est la meme API, avec des champs que seul un admin
 * recoit (produit desactive, compte auteur d'une commande...).
 */

/** Forme jointe sur un produit : `GET /products` ne selecte que ces deux champs. */
export type Marque = { id: string; name: string };

/** `GET /marques` : la marque complete, avec ses produits rattaches comptes. */
export type MarqueDetail = Marque & {
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  _count: { products: number };
};

export type MarqueInput = {
  name: string;
  slug: string;
  logoUrl?: string;
};

/**
 * `GET /products` renvoie categorie et marque jointes : le backoffice les a
 * toujours, la ou une lecture unitaire les laisse optionnelles.
 */
export type AdminProduct = Product & {
  category: { id: string; name: string; slug: string };
  marque: Marque | null;
};

export type ProductRelation = {
  id: string;
  relatedProductId: string;
  relationType: RelationType;
  relatedProduct: { id: string; name: string };
};

/** Doit rester aligne sur `backend/src/common/constants.ts`. */
export const RELATION_TYPES = [
  { value: "similar", label: "Produit similaire" },
  { value: "frequently_bought_together", label: "Souvent achete ensemble" },
] as const;

export type RelationType = (typeof RELATION_TYPES)[number]["value"];

/** Avis tel que renvoye sur la fiche produit (sans le produit joint). */
export type ProductReview = {
  id: string;
  productId: string;
  rating: number;
  comment: string | null;
  moderationStatus: ModerationStatus;
  createdAt: string;
  /** Le nom affiche vient du compte : `authorName` n'existe plus. */
  user: { id: string; fullName: string };
};

/** L'auteur n'y figure pas : le backend le lit sur le JWT. */
export type ReviewInput = {
  productId: string;
  rating: number;
  comment?: string;
};

/** Le produit n'y figure pas : un avis ne change pas de produit. */
export type ReviewUpdateInput = {
  rating?: number;
  /** `null` retire le commentaire et ne garde que la note. */
  comment?: string | null;
};

/** `GET /products/:id` vu par un admin : specs, relations et avis non moderes. */
export type AdminProductDetail = AdminProduct & {
  specs: ProductSpec[];
  relationsFrom: ProductRelation[];
  reviews: ProductReview[];
};

export type ProductInput = {
  categoryId: string;
  marqueId?: string | null;
  name: string;
  slug: string;
  /** `null` vide le champ, `undefined` laisse la valeur en place. */
  reference?: string | null;
  /** Remplacees en bloc : `[]` vide la liste. */
  colors?: string[];
  dimensions?: string | null;
  description?: string | null;
  price: number;
  stock?: number;
  isPremium?: boolean;
  /** `null` detache la video, `undefined` laisse la valeur en place. */
  videoUrl?: string | null;
  isActive?: boolean;
};

/**
 * Corps attendu par `POST|PATCH /admin/promotions`.
 *
 * Les regles sont celles des DTO backend : `discountPercent` entre 0 et 100,
 * `endDate` strictement posterieure a `startDate`. Les dates partent en ISO,
 * `@Type(() => Date)` les reconstruit cote serveur.
 */
export type PromotionInput = {
  productId: string;
  /** `null` retire le titre. */
  titre?: string | null;
  discountPercent: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  isFeatured?: boolean;
};

export type CategoryInput = {
  name: string;
  slug: string;
  parentId?: string | null;
  imageUrl?: string;
  displayOrder?: number;
  isFeatured?: boolean;
};

/** Doit rester aligne sur `backend/src/common/constants.ts`. */
export const ORDER_STATUSES = [
  { value: "EN_ATTENTE_PAIEMENT", label: "En attente de paiement" },
  { value: "PAYEE", label: "Payee" },
  { value: "EN_PREPARATION", label: "En preparation" },
  { value: "EXPEDIEE", label: "Expediee" },
  { value: "LIVREE", label: "Livree" },
  { value: "PRETE_A_RETIRER", label: "Prete a retirer" },
  { value: "RETIREE", label: "Retiree" },
  { value: "ANNULEE", label: "Annulee" },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

/** Doit rester aligne sur l'enum `PaymentStatus` de `schema.prisma`. */
export const PAYMENT_STATUSES = [
  { value: "NON_PAYE", label: "Non paye" },
  { value: "PAYE", label: "Paye" },
  { value: "ECHOUE", label: "Echoue" },
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]["value"];

/** Doit rester aligne sur l'enum `FulfillmentMethod` de `schema.prisma`. */
export const FULFILLMENT_METHODS = [
  { value: "LIVRAISON", label: "Livraison" },
  { value: "RETRAIT_BOUTIQUE", label: "Retrait en boutique" },
] as const;

export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number]["value"];

/** Le compte auteur, joint sur toutes les lectures de commande. */
export type OrderCustomer = { id: string; email: string; fullName: string };

/** Une ligne de `order_status_history`. `fromStatus` est nul a la creation. */
export type OrderStatusChange = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: string;
  /** Nul si le compte a ete supprime depuis */
  changedBy: { id: string; fullName: string } | null;
};

/** `statusHistory` n'est joint qu'a la lecture unitaire, pas a la liste. */
export type AdminOrder = Order & {
  user: OrderCustomer;
  statusHistory?: OrderStatusChange[];
};

/** Doit rester aligne sur `backend/src/common/constants.ts`. */
export const MODERATION_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Publie" },
  { value: "rejected", label: "Rejete" },
] as const;

export type ModerationStatus = (typeof MODERATION_STATUSES)[number]["value"];

export type AdminReview = {
  id: string;
  productId: string;
  rating: number;
  comment: string | null;
  moderationStatus: ModerationStatus;
  createdAt: string;
  user: { id: string; fullName: string };
  product: { id: string; name: string; slug: string };
};

export type DashboardStats = {
  revenue: {
    today: string;
    month: string;
    allTime: string;
    averageOrder: string;
  };
  orders: {
    today: number;
    month: number;
    allTime: number;
    byStatus: Partial<Record<OrderStatus, number>>;
  };
  catalog: {
    products: number;
    inactiveProducts: number;
    categories: number;
    lowStockThreshold: number;
    lowStock: { id: string; name: string; stock: number }[];
  };
  customers: number;
  /** Avis deposes en attente de validation. */
  pendingReviews: number;
  topProducts: { productName: string; quantity: number }[];
  recentOrders: {
    id: string;
    number: string;
    contactName: string;
    status: OrderStatus;
    total: string;
    createdAt: string;
  }[];
  /** 30 derniers jours, aujourd'hui en dernier ; `date` au format `2026-03-12`. */
  salesByDay: { date: string; revenue: string; orders: number }[];
  /** 12 derniers mois, le mois en cours en dernier ; `month` au format `2026-03`. */
  salesByMonth: { month: string; revenue: string; orders: number }[];
};

/**
 * Live en direct (`GET /live/current`) : `id` est celui du live en base, `url`
 * le lien de la video Facebook ; `startedAt` arrive en ISO.
 */
export type FacebookLive = {
  id: string;
  title: string;
  url: string;
  startedAt: string | null;
};

// ------------------------------------------------------------- Live shopping

export const LIVE_STATUSES = [
  { value: "PROGRAMME", label: "À venir" },
  { value: "EN_DIRECT", label: "En direct" },
  { value: "TERMINE", label: "Terminé" },
] as const;

export type LiveStatus = (typeof LIVE_STATUSES)[number]["value"];

type LiveBase = {
  id: string;
  title: string;
  description: string | null;
  /** Colle par la vendeuse au lancement du direct ; sert ensuite de replay. */
  facebookUrl: string | null;
  status: LiveStatus;
  /** Date annoncee ; `startedAt` / `endedAt` sont les dates reelles. */
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  /** Faux : live termine retire de « Nos vidéos » sans etre supprime. */
  replayVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * `GET /lives/current` : produits actifs seulement, chacun avec sa promotion
 * en cours — meme forme qu'une carte du catalogue.
 */
export type Live = LiveBase & { products: Product[] };

/**
 * `GET /lives/replays` : un live termine qui a une video, sans ses produits —
 * la carte de la section « Nos vidéos ».
 */
export type LiveReplay = Pick<
  LiveBase,
  "id" | "title" | "description" | "startedAt" | "endedAt"
> & {
  facebookUrl: string;
  /** Produits actifs : ceux que la page du replay affichera. */
  _count: { products: number };
};

/** `GET /lives/admin`. */
export type AdminLive = LiveBase & {
  _count: { products: number };
  /** Commandes passees depuis la page live, annulees exclues. */
  sales: { orders: number; revenue: string };
};

/** `GET /lives/admin/:id` : la selection telle quelle, desactives compris. */
export type AdminLiveDetail = LiveBase & {
  products: {
    id: string;
    productId: string;
    displayOrder: number;
    product: {
      id: string;
      name: string;
      reference: string | null;
      price: string;
      stock: number;
      isActive: boolean;
      images: ProductImage[];
    };
  }[];
};

/** Le lien Facebook n'en fait pas partie : il n'est jamais saisi. */
export type LiveInput = {
  title: string;
  description: string | null;
  scheduledAt: string;
  /** Dans l'ordre d'affichage ; remplace la selection en bloc. */
  productIds: string[];
};
