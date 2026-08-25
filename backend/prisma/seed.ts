import 'dotenv/config';

import { Prisma } from '@prisma/client';
import {
  MODERATION_STATUS,
  ORDER_STATUS,
  PAYMENT_METHOD,
  RELATION_TYPE,
} from '../src/common/constants';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Jeu de donnees de developpement.
 *
 * Le seed est rejouable : il vide le perimetre catalogue + contenu puis le
 * recree a l'identique. Les commandes et les clients ne sont jamais purges
 * (une commande passee ne doit pas disparaitre d'un `yarn seed`), et la
 * commande de demonstration n'est creee que si la table est vide.
 *
 * Montants en ariary, sans decimales significatives.
 */

const prisma = new PrismaService();

// =========================================================
// Donnees
// =========================================================

type CategorySeed = {
  slug: string;
  name: string;
  parentSlug?: string;
  displayOrder: number;
  isFeatured?: boolean;
};

const CATEGORIES: CategorySeed[] = [
  { slug: 'robotique', name: 'Robotique', displayOrder: 1, isFeatured: true },
  {
    slug: 'voyage-spatial',
    name: 'Voyage spatial',
    displayOrder: 2,
    isFeatured: true,
  },
  {
    slug: 'boissons-alimentation',
    name: 'Boissons & alimentation',
    displayOrder: 3,
    isFeatured: true,
  },
  { slug: 'collection', name: 'Objets de collection', displayOrder: 4 },

  {
    slug: 'pieces-modules-robotiques',
    name: 'Pieces & modules robotiques',
    parentSlug: 'robotique',
    displayOrder: 1,
  },
  {
    slug: 'robots-complets',
    name: 'Robots complets',
    parentSlug: 'robotique',
    displayOrder: 2,
  },
  {
    slug: 'vaisseaux-pieces',
    name: 'Vaisseaux & pieces',
    parentSlug: 'voyage-spatial',
    displayOrder: 1,
  },
  {
    slug: 'equipement-de-vol',
    name: 'Equipement de vol',
    parentSlug: 'voyage-spatial',
    displayOrder: 2,
  },
];

type VendorSeed = { slug: string; name: string };

const VENDORS: VendorSeed[] = [
  { slug: 'planet-express', name: 'Planet Express' },
  { slug: 'momcorp', name: 'MomCorp' },
  { slug: 'slurm-inc', name: 'Slurm Inc.' },
  { slug: 'applied-cryogenics', name: 'Applied Cryogenics' },
  { slug: 'benders-bending-co', name: "Bender's Bending Co." },
];

type ProductSeed = {
  slug: string;
  name: string;
  categorySlug: string;
  vendorSlug: string | null;
  reference: string;
  description: string;
  price: string;
  promoPrice?: string;
  stock: number;
  isPremium?: boolean;
  videoUrl?: string;
  specs: [string, string][];
  imageCount: number;
};

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'slurm-original-pack-6',
    name: 'Slurm Original — pack de 6',
    categorySlug: 'boissons-alimentation',
    vendorSlug: 'slurm-inc',
    reference: 'SLM-001',
    description:
      "La boisson la plus consommee de la galaxie, en pack familial de six canettes de 33 cl. Formule originale inchangee depuis 2761.",
    price: '24000',
    stock: 240,
    specs: [
      ['Contenance', '6 x 33 cl'],
      ['Origine', 'Wormulon'],
      ['Conservation', '36 mois'],
    ],
    imageCount: 3,
  },
  {
    slug: 'slurm-xtreme',
    name: 'Slurm Xtreme — canette 50 cl',
    categorySlug: 'boissons-alimentation',
    vendorSlug: 'slurm-inc',
    reference: 'SLM-050',
    description:
      'Version survitaminee du Slurm original. Deconseillee aux organismes de moins de trois estomacs.',
    price: '6500',
    promoPrice: '4875',
    stock: 480,
    specs: [
      ['Contenance', '50 cl'],
      ['Cafeine', '180 mg'],
    ],
    imageCount: 2,
  },
  {
    slug: 'olde-fortran',
    name: 'Olde Fortran — malt liquor pour robots',
    categorySlug: 'boissons-alimentation',
    vendorSlug: 'benders-bending-co',
    reference: 'OFR-1701',
    description:
      "Alcool de malt haute densite destine aux unites robotiques. Carburant et boisson a la fois.",
    price: '18000',
    stock: 90,
    specs: [
      ['Contenance', '75 cl'],
      ['Titre', '48% vol.'],
      ['Compatibilite', 'Unites series 20 a 40'],
    ],
    imageCount: 2,
  },
  {
    slug: 'popplers-500g',
    name: 'Popplers — sachet 500 g',
    categorySlug: 'boissons-alimentation',
    vendorSlug: 'planet-express',
    reference: 'PPL-500',
    description:
      'Bouchees croustillantes ramenees par nos equipages. Origine desormais certifiee sans espece sentiente.',
    price: '12500',
    stock: 150,
    specs: [
      ['Poids net', '500 g'],
      ['Certification', 'Sans espece sentiente'],
    ],
    imageCount: 1,
  },
  {
    slug: 'bending-unit-22',
    name: 'Bending Unit 22 — robot plieur',
    categorySlug: 'robots-complets',
    vendorSlug: 'momcorp',
    reference: 'BU-22',
    description:
      "Unite de pliage industrielle reconditionnee. Capable de plier tout alliage jusqu'a la classe 8. Personnalite incluse, non desactivable.",
    price: '3900000',
    stock: 4,
    isPremium: true,
    videoUrl: 'https://videos.example.test/bending-unit-22.mp4',
    specs: [
      ['Alliage maximal', 'Classe 8'],
      ['Autonomie', '72 h'],
      ['Garantie', '12 mois piece et main d’oeuvre'],
    ],
    imageCount: 4,
  },
  {
    slug: 'robot-1x',
    name: 'Robot 1-X — modele ecologique',
    categorySlug: 'robots-complets',
    vendorSlug: 'momcorp',
    reference: 'R1X-100',
    description:
      'Derniere generation MomCorp : consommation nulle, rejets neutralises, rendement superieur de 40% au modele precedent.',
    price: '5400000',
    stock: 2,
    isPremium: true,
    specs: [
      ['Emissions', 'Neutres'],
      ['Rendement', '+40% vs 1-Y'],
      ['Garantie', '24 mois'],
    ],
    imageCount: 3,
  },
  {
    slug: 'antenne-communication-robotique',
    name: 'Antenne de communication robotique',
    categorySlug: 'pieces-modules-robotiques',
    vendorSlug: 'momcorp',
    reference: 'ANT-004',
    description:
      'Antenne retractable compatible avec la majorite des unites bipedes. Portee orbitale basse.',
    price: '145000',
    stock: 60,
    specs: [
      ['Portee', 'Orbite basse'],
      ['Montage', 'Cranien standard'],
    ],
    imageCount: 2,
  },
  {
    slug: 'compartiment-thoracique',
    name: 'Compartiment thoracique universel',
    categorySlug: 'pieces-modules-robotiques',
    vendorSlug: 'benders-bending-co',
    reference: 'CMP-010',
    description:
      'Volume de rangement interne verrouillable. Capacite reelle superieure aux dimensions exterieures.',
    price: '320000',
    stock: 25,
    specs: [
      ['Capacite', '38 L'],
      ['Verrouillage', 'Code 4 chiffres'],
    ],
    imageCount: 2,
  },
  {
    slug: 'matrice-memoire-quantique',
    name: 'Matrice memoire quantique 64 To',
    categorySlug: 'pieces-modules-robotiques',
    vendorSlug: 'momcorp',
    reference: 'MEM-64',
    description:
      "Extension memoire a acces quantique. Sauvegarde de personnalite incluse, restauration non garantie.",
    price: '780000',
    promoPrice: '663000',
    stock: 12,
    specs: [
      ['Capacite', '64 To'],
      ['Latence', '0,4 ns'],
      ['Interface', 'Bus MomCorp v9'],
    ],
    imageCount: 2,
  },
  {
    slug: 'moteur-dark-matter',
    name: 'Moteur a distorsion — dark matter',
    categorySlug: 'vaisseaux-pieces',
    vendorSlug: 'momcorp',
    reference: 'DRK-900',
    description:
      "Le moteur ne deplace pas le vaisseau : il deplace l'univers autour. Combustible dark matter non fourni.",
    price: '12500000',
    stock: 1,
    isPremium: true,
    specs: [
      ['Combustible', 'Dark matter'],
      ['Poussee', 'Illimitee (referentiel externe)'],
      ['Installation', 'Sur devis'],
    ],
    imageCount: 3,
  },
  {
    slug: 'chambre-cryogenique-portative',
    name: 'Chambre cryogenique portative',
    categorySlug: 'vaisseaux-pieces',
    vendorSlug: 'applied-cryogenics',
    reference: 'CRY-999',
    description:
      'Unite de conservation individuelle programmable de 1 a 1000 ans. Reveil automatique garanti par contrat.',
    price: '7200000',
    stock: 3,
    isPremium: true,
    specs: [
      ['Duree programmable', '1 a 1000 ans'],
      ['Temperature', '-196 degres C'],
      ['Alimentation', 'Autonome 1200 ans'],
    ],
    imageCount: 3,
  },
  {
    slug: 'casque-navigation-pe',
    name: 'Casque de navigation Planet Express',
    categorySlug: 'equipement-de-vol',
    vendorSlug: 'planet-express',
    reference: 'CSQ-021',
    description:
      'Casque de pilotage avec affichage tete haute et liaison directe au poste de commandement.',
    price: '260000',
    stock: 40,
    specs: [
      ['Affichage', 'Tete haute'],
      ['Autonomie', '18 h'],
    ],
    imageCount: 2,
  },
  {
    slug: 'combinaison-pressurisee',
    name: 'Combinaison pressurisee classe 3',
    categorySlug: 'equipement-de-vol',
    vendorSlug: 'planet-express',
    reference: 'CMB-003',
    description:
      'Combinaison de sortie extravehiculaire homologuee pour atmospheres corrosives et vide integral.',
    price: '890000',
    stock: 18,
    specs: [
      ['Classe', '3 (vide integral)'],
      ['Autonomie', '8 h'],
      ['Tailles', 'S a XXL'],
    ],
    imageCount: 3,
  },
  {
    slug: 'maquette-planet-express',
    name: 'Maquette du vaisseau Planet Express',
    categorySlug: 'collection',
    vendorSlug: 'planet-express',
    reference: 'MQT-001',
    description:
      'Reproduction a l’echelle 1/144 du vaisseau de livraison, montee et peinte a la main.',
    price: '175000',
    stock: 55,
    specs: [
      ['Echelle', '1/144'],
      ['Materiau', 'Resine'],
      ['Longueur', '32 cm'],
    ],
    imageCount: 3,
  },
  {
    slug: 'trefle-7-feuilles',
    name: 'Trefle a 7 feuilles sous vitrine',
    categorySlug: 'collection',
    vendorSlug: null,
    reference: 'TRF-007',
    description:
      'Piece unique certifiee, presentee sous vitrine scellee. Porte-bonheur reserve a son proprietaire legitime.',
    price: '450000',
    stock: 7,
    specs: [
      ['Authenticite', 'Certificat inclus'],
      ['Vitrine', 'Verre trempe scelle'],
    ],
    imageCount: 2,
  },
];

/** Groupes de produits interchangeables : toutes les paires sont creees dans les deux sens. */
const SIMILAR_GROUPS: string[][] = [
  ['slurm-original-pack-6', 'slurm-xtreme', 'olde-fortran'],
  ['bending-unit-22', 'robot-1x'],
  ['casque-navigation-pe', 'combinaison-pressurisee'],
  ['maquette-planet-express', 'trefle-7-feuilles'],
];

/** Relations dirigees : acheter la cle amene souvent a acheter les valeurs. */
const BOUGHT_TOGETHER: Record<string, string[]> = {
  'bending-unit-22': [
    'antenne-communication-robotique',
    'compartiment-thoracique',
    'olde-fortran',
  ],
  'robot-1x': ['matrice-memoire-quantique', 'antenne-communication-robotique'],
  'moteur-dark-matter': ['chambre-cryogenique-portative'],
  'casque-navigation-pe': ['combinaison-pressurisee'],
  'slurm-original-pack-6': ['popplers-500g'],
};

type PromotionSeed = {
  productSlug: string;
  discountPercent: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const PROMOTIONS: PromotionSeed[] = [
  {
    productSlug: 'slurm-xtreme',
    discountPercent: '25',
    startDate: '2026-08-01',
    endDate: '2026-09-30',
    isActive: true,
  },
  {
    productSlug: 'matrice-memoire-quantique',
    discountPercent: '15',
    startDate: '2026-08-15',
    endDate: '2026-10-15',
    isActive: true,
  },
  // Promotion terminee : sert a verifier qu'elle n'est plus appliquee.
  {
    productSlug: 'olde-fortran',
    discountPercent: '20',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    isActive: false,
  },
];

type ReviewSeed = {
  productSlug: string;
  authorName: string;
  rating: number;
  comment: string;
  moderationStatus: string;
};

const REVIEWS: ReviewSeed[] = [
  {
    productSlug: 'slurm-original-pack-6',
    authorName: 'Fry P.',
    rating: 5,
    comment: "Impossible de s'arreter apres la premiere canette.",
    moderationStatus: MODERATION_STATUS.APPROVED,
  },
  {
    productSlug: 'slurm-original-pack-6',
    authorName: 'Hermes C.',
    rating: 4,
    comment: 'Livraison conforme, pack bien protege. Prix correct.',
    moderationStatus: MODERATION_STATUS.APPROVED,
  },
  {
    productSlug: 'slurm-original-pack-6',
    authorName: 'Zoidberg J.',
    rating: 3,
    comment: 'Bon produit mais je prefere les restes.',
    moderationStatus: MODERATION_STATUS.PENDING,
  },
  {
    productSlug: 'bending-unit-22',
    authorName: 'Leela T.',
    rating: 4,
    comment: 'Tres efficace au travail. Le caractere demande de la patience.',
    moderationStatus: MODERATION_STATUS.APPROVED,
  },
  {
    productSlug: 'bending-unit-22',
    authorName: 'Anonyme',
    rating: 1,
    comment: 'Message hors sujet supprime par la moderation.',
    moderationStatus: MODERATION_STATUS.REJECTED,
  },
  {
    productSlug: 'casque-navigation-pe',
    authorName: 'Kif K.',
    rating: 5,
    comment: 'Affichage lisible meme en approche atmospherique.',
    moderationStatus: MODERATION_STATUS.APPROVED,
  },
  {
    productSlug: 'chambre-cryogenique-portative',
    authorName: 'Michelle',
    rating: 2,
    comment: 'Reveil a l’heure prevue, mais siecle decevant.',
    moderationStatus: MODERATION_STATUS.APPROVED,
  },
  {
    productSlug: 'maquette-planet-express',
    authorName: 'Amy W.',
    rating: 5,
    comment: 'Finition impeccable, avis en attente de validation.',
    moderationStatus: MODERATION_STATUS.PENDING,
  },
];

const RESELLERS = [
  {
    name: 'Planet Express Antananarivo',
    address: 'Lot II M 45 Ankorondrano, Antananarivo 101',
    phone: '034 12 345 67',
    hours: 'Lun-Sam 08h-18h',
    displayOrder: 1,
  },
  {
    name: 'MomCorp Store Analakely',
    address: "Avenue de l'Independance, Analakely, Antananarivo 101",
    phone: '033 22 456 78',
    hours: 'Lun-Sam 09h-19h',
    displayOrder: 2,
  },
  {
    name: 'Robot Arms Apartments — Toamasina',
    address: 'Boulevard Joffre, Toamasina 501',
    phone: '032 33 567 89',
    hours: 'Lun-Ven 08h-17h',
    displayOrder: 3,
  },
  {
    name: 'Applied Cryogenics — Antsirabe',
    address: 'Rue Ravoahangy, Antsirabe 110',
    phone: '034 44 678 90',
    hours: 'Mar-Sam 09h-17h',
    displayOrder: 4,
  },
  {
    name: 'Slurm Factory Outlet — Mahajanga',
    address: 'Bord de mer, Mahajanga 401',
    phone: null,
    hours: 'Lun-Dim 10h-20h',
    displayOrder: 5,
  },
];

type PostSeed = {
  slug: string;
  title: string;
  content: string;
  publishedAt: string | null;
  likeSessions: string[];
  comments: { authorName: string; comment: string }[];
};

const POSTS: PostSeed[] = [
  {
    slug: 'slurm-la-recette-devoilee',
    title: 'Slurm : la recette enfin devoilee ?',
    content:
      "Depuis des siecles, la composition du Slurm alimente les rumeurs les plus improbables. Nous avons visite l'usine de Wormulon pour separer les faits des legendes urbaines — et repondre a la question que tout le monde pose sur l'origine du liquide.",
    publishedAt: '2026-07-12',
    likeSessions: ['sess-demo-1', 'sess-demo-2', 'sess-demo-3'],
    comments: [
      { authorName: 'Fry P.', comment: 'Je ne veux surtout pas savoir.' },
      { authorName: 'Bender', comment: 'Article correct. Il manque la biere.' },
    ],
  },
  {
    slug: 'entretien-unite-plieuse',
    title: "Guide d'entretien de votre unite plieuse",
    content:
      "Une unite de pliage bien entretenue depasse facilement les quarante ans de service. Lubrification des articulations, verification du compartiment thoracique, mise a jour de la matrice memoire : voici le calendrier d'entretien que nous recommandons a nos clients.",
    publishedAt: '2026-07-28',
    likeSessions: ['sess-demo-2', 'sess-demo-4'],
    comments: [
      {
        authorName: 'Leela T.',
        comment: 'Le calendrier trimestriel a vraiment change la duree de vie.',
      },
    ],
  },
  {
    slug: 'tarifs-livraison-interplanetaire',
    title: 'Livraison interplanetaire : nos tarifs 2026',
    content:
      "Livraison offerte a Antananarivo des 100 000 Ar d'achat, forfait unique pour le reste de Madagascar, et grille specifique au-dela de l'orbite lunaire. Le detail complet des zones et des delais est desormais consultable avant la validation du panier.",
    publishedAt: '2026-08-10',
    likeSessions: ['sess-demo-1'],
    comments: [],
  },
  {
    slug: 'ouverture-boutique-fianarantsoa',
    title: 'Ouverture prochaine de notre boutique a Fianarantsoa',
    content:
      "Brouillon : annoncer l'ouverture, preciser l'adresse definitive et la date d'inauguration avant publication.",
    publishedAt: null,
    likeSessions: [],
    comments: [],
  },
];

// =========================================================
// Insertion
// =========================================================

/**
 * Purge le perimetre gere par le seed.
 *
 * L'ordre respecte les contraintes : les produits partent avant les categories
 * (`onDelete: Restrict`). Les `order_items` deja enregistres survivent avec un
 * `productId` a NULL — c'est la regle metier : une commande passee ne bouge pas
 * quand le catalogue change.
 */
async function reset() {
  await prisma.productRelation.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productSpec.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.category.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.post.deleteMany();
  await prisma.reseller.deleteMany();
}

async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  // Les parents d'abord : les enfants referencent leur id.
  const ordered = [
    ...CATEGORIES.filter((category) => !category.parentSlug),
    ...CATEGORIES.filter((category) => category.parentSlug),
  ];

  for (const category of ordered) {
    const created = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        parentId: category.parentSlug ? ids.get(category.parentSlug) : null,
        imageUrl: `/images/categories/${category.slug}.jpg`,
        displayOrder: category.displayOrder,
        isFeatured: category.isFeatured ?? false,
      },
    });

    ids.set(category.slug, created.id);
  }

  return ids;
}

async function seedVendors(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const vendor of VENDORS) {
    const created = await prisma.vendor.create({
      data: {
        name: vendor.name,
        slug: vendor.slug,
        logoUrl: `/images/vendors/${vendor.slug}.png`,
      },
    });

    ids.set(vendor.slug, created.id);
  }

  return ids;
}

async function seedProducts(
  categoryIds: Map<string, string>,
  vendorIds: Map<string, string>,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const product of PRODUCTS) {
    const categoryId = categoryIds.get(product.categorySlug);

    if (!categoryId) {
      throw new Error(
        `Categorie inconnue "${product.categorySlug}" pour le produit ${product.slug}`,
      );
    }

    const created = await prisma.product.create({
      data: {
        categoryId,
        vendorId: product.vendorSlug
          ? (vendorIds.get(product.vendorSlug) ?? null)
          : null,
        name: product.name,
        slug: product.slug,
        reference: product.reference,
        description: product.description,
        price: new Prisma.Decimal(product.price),
        promoPrice: product.promoPrice
          ? new Prisma.Decimal(product.promoPrice)
          : null,
        stock: product.stock,
        isPremium: product.isPremium ?? false,
        videoUrl: product.videoUrl ?? null,
        images: {
          create: Array.from({ length: product.imageCount }, (_, index) => ({
            imageUrl: `/images/products/${product.slug}-${index + 1}.jpg`,
            displayOrder: index,
            isPrimary: index === 0,
          })),
        },
        specs: {
          create: product.specs.map(([label, value], index) => ({
            label,
            value,
            displayOrder: index,
          })),
        },
      },
    });

    ids.set(product.slug, created.id);
  }

  return ids;
}

async function seedRelations(productIds: Map<string, string>) {
  const rows: Prisma.ProductRelationCreateManyInput[] = [];

  const idOf = (slug: string) => {
    const id = productIds.get(slug);

    if (!id) {
      throw new Error(`Produit inconnu dans les relations : ${slug}`);
    }

    return id;
  };

  for (const group of SIMILAR_GROUPS) {
    for (const slug of group) {
      for (const otherSlug of group) {
        if (slug === otherSlug) {
          continue;
        }

        rows.push({
          productId: idOf(slug),
          relatedProductId: idOf(otherSlug),
          relationType: RELATION_TYPE.SIMILAR,
        });
      }
    }
  }

  for (const [slug, relatedSlugs] of Object.entries(BOUGHT_TOGETHER)) {
    for (const relatedSlug of relatedSlugs) {
      rows.push({
        productId: idOf(slug),
        relatedProductId: idOf(relatedSlug),
        relationType: RELATION_TYPE.FREQUENTLY_BOUGHT_TOGETHER,
      });
    }
  }

  await prisma.productRelation.createMany({ data: rows });

  return rows.length;
}

async function seedPromotions(productIds: Map<string, string>) {
  for (const promotion of PROMOTIONS) {
    await prisma.promotion.create({
      data: {
        productId: productIds.get(promotion.productSlug)!,
        discountPercent: new Prisma.Decimal(promotion.discountPercent),
        startDate: new Date(promotion.startDate),
        endDate: new Date(promotion.endDate),
        isActive: promotion.isActive,
      },
    });
  }
}

async function seedReviews(productIds: Map<string, string>) {
  await prisma.review.createMany({
    data: REVIEWS.map((review) => ({
      productId: productIds.get(review.productSlug)!,
      authorName: review.authorName,
      rating: review.rating,
      comment: review.comment,
      moderationStatus: review.moderationStatus,
    })),
  });
}

async function seedResellers() {
  await prisma.reseller.createMany({
    data: RESELLERS.map((reseller) => ({
      ...reseller,
      logoUrl: null,
    })),
  });
}

async function seedPosts() {
  for (const post of POSTS) {
    await prisma.post.create({
      data: {
        title: post.title,
        slug: post.slug,
        content: post.content,
        photoUrl: `/images/posts/${post.slug}.jpg`,
        viewsCount: post.likeSessions.length * 17,
        // Le compteur suit exactement le nombre de lignes PostLike creees.
        likesCount: post.likeSessions.length,
        publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
        likes: {
          create: post.likeSessions.map((sessionId) => ({ sessionId })),
        },
        comments: { create: post.comments },
      },
    });
  }
}

/**
 * Commande de demonstration, creee seulement si aucune commande n'existe :
 * un `yarn seed` ne doit pas polluer des commandes de test en cours.
 */
async function seedDemoOrder(productIds: Map<string, string>) {
  if ((await prisma.order.count()) > 0) {
    return false;
  }

  const lines = [
    { slug: 'slurm-original-pack-6', quantity: 2 },
    { slug: 'popplers-500g', quantity: 1 },
    { slug: 'casque-navigation-pe', quantity: 1 },
  ];

  const items = await Promise.all(
    lines.map(async (line) => {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: productIds.get(line.slug)! },
      });

      return {
        productId: product.id,
        productName: product.name,
        quantity: line.quantity,
        unitPrice: product.promoPrice ?? product.price,
      };
    }),
  );

  // Decimal obligatoire : les montants ne passent jamais par l'arithmetique JS.
  const subtotal = items.reduce(
    (sum, item) => sum.add(item.unitPrice.mul(item.quantity)),
    new Prisma.Decimal(0),
  );
  const shippingFee = new Prisma.Decimal('8000');

  const customer = await prisma.customer.create({
    data: {
      fullName: 'Philip J. Fry',
      phone: '034 11 222 33',
      email: 'fry@planetexpress.test',
      address: 'Lot IVB 12 Ambatoroka, Antananarivo 101',
    },
  });

  await prisma.order.create({
    data: {
      customerId: customer.id,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      customerAddress: customer.address!,
      status: ORDER_STATUS.CONFIRMED,
      paymentMethod: PAYMENT_METHOD.MVOLA,
      subtotal,
      shippingFee,
      total: subtotal.add(shippingFee),
      items: { create: items },
    },
  });

  return true;
}

async function main() {
  console.log('Purge du perimetre catalogue et contenu...');
  await reset();

  const categoryIds = await seedCategories();
  const vendorIds = await seedVendors();
  const productIds = await seedProducts(categoryIds, vendorIds);
  const relationCount = await seedRelations(productIds);

  await seedPromotions(productIds);
  await seedReviews(productIds);
  await seedResellers();
  await seedPosts();

  const orderCreated = await seedDemoOrder(productIds);

  console.log(`  categories   ${categoryIds.size}`);
  console.log(`  vendeurs     ${vendorIds.size}`);
  console.log(`  produits     ${productIds.size}`);
  console.log(`  relations    ${relationCount}`);
  console.log(`  promotions   ${PROMOTIONS.length}`);
  console.log(`  avis         ${REVIEWS.length}`);
  console.log(`  revendeurs   ${RESELLERS.length}`);
  console.log(`  articles     ${POSTS.length}`);
  console.log(
    `  commande demo ${orderCreated ? 'creee' : 'ignoree (commandes existantes)'}`,
  );
  console.log('Seed termine.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
