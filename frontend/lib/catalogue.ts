import { effectivePrice } from "./format";
import type { Category, Product } from "./types";

/**
 * Slug reserve du catalogue : `/catalogue/tous` liste toutes les categories.
 * C'est la cible de la recherche du header, l'API n'ayant pas de route dediee.
 */
export const ALL_CATEGORIES_SLUG = "tous";

/** 5 colonnes x 4 lignes, comme la grille de la maquette. */
export const PAGE_SIZE = 20;

/**
 * `GET /products?categoryId=` filtre sur une categorie exacte. Les produits du
 * seed sont ranges dans les feuilles : ouvrir un rayon parent doit donc
 * remonter aussi ceux de ses sous-rayons.
 */
export function collectCategoryIds(
  categories: Category[],
  rootId: string,
): string[] {
  const ids = [rootId];

  for (const category of categories) {
    if (category.parentId && ids.includes(category.parentId)) {
      ids.push(category.id);
    }
  }

  return ids;
}

export function matchesSearch(name: string, term: string): boolean {
  return normalize(name).includes(normalize(term));
}

/** Recherche insensible a la casse et aux accents (le seed est non accentue). */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// ------------------------------------------------------------------ Filtres

/**
 * Noms des parametres d'URL de la colonne de filtres. Ils vivent dans l'URL
 * (donc partageable et rechargeable) et sont soumis par un formulaire GET.
 */
export const PARAM = {
  search: "q",
  page: "page",
  sort: "tri",
  vendor: "vendeur",
  bracket: "prix",
  stock: "stock",
  premium: "premium",
  min: "min",
  max: "max",
} as const;

/**
 * Tris realisables sur les champs que `GET /products` renvoie reellement.
 * L'API ordonne par date de creation decroissante : `nouveautes` est donc son
 * ordre naturel, et ne retrie rien.
 */
export const CATALOGUE_SORTS = [
  { value: "nouveautes", label: "Nouveautes" },
  { value: "populaires", label: "Les plus consultes" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix decroissant" },
  { value: "nom", label: "Nom (A-Z)" },
] as const;

export type CatalogueSort = (typeof CATALOGUE_SORTS)[number]["value"];

const DEFAULT_SORT: CatalogueSort = "nouveautes";

/** Tranches de prix de la maquette, en ariary. `max` absent = « et plus ». */
export const PRICE_BRACKETS = [
  { value: "0-50000", label: "Jusqu'a 50 000 Ar", min: 0, max: 50_000 },
  { value: "50000-100000", label: "De 50 000 a 100 000 Ar", min: 50_000, max: 100_000 },
  { value: "100000-250000", label: "De 100 000 a 250 000 Ar", min: 100_000, max: 250_000 },
  { value: "250000-500000", label: "De 250 000 a 500 000 Ar", min: 250_000, max: 500_000 },
  { value: "500000-", label: "500 000 Ar et plus", min: 500_000, max: undefined },
] as const;

export type CatalogueFilters = {
  search: string;
  sort: CatalogueSort;
  page: number;
  vendors: string[];
  brackets: string[];
  inStock: boolean;
  premium: boolean;
  /** Bornes du curseur ; `undefined` = borne du rayon, donc pas de filtre. */
  priceMin?: number;
  priceMax?: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

export function parseFilters(searchParams: SearchParams): CatalogueFilters {
  return {
    search: single(searchParams[PARAM.search]).trim(),
    sort: parseSort(single(searchParams[PARAM.sort])),
    page: Math.max(1, Number.parseInt(single(searchParams[PARAM.page]), 10) || 1),
    vendors: list(searchParams[PARAM.vendor]),
    brackets: list(searchParams[PARAM.bracket]).filter((value) =>
      PRICE_BRACKETS.some((bracket) => bracket.value === value),
    ),
    inStock: single(searchParams[PARAM.stock]) === "1",
    premium: single(searchParams[PARAM.premium]) === "1",
    priceMin: parseAmount(single(searchParams[PARAM.min])),
    priceMax: parseAmount(single(searchParams[PARAM.max])),
  };
}

/** Reconstruit l'URL des filtres courants ; `overrides` remplace une cle. */
export function filtersToQuery(
  filters: CatalogueFilters,
  overrides: { page?: number; sort?: CatalogueSort } = {},
): URLSearchParams {
  const page = overrides.page ?? filters.page;
  const sort = overrides.sort ?? filters.sort;
  const query = new URLSearchParams();

  if (filters.search) query.set(PARAM.search, filters.search);
  if (sort !== DEFAULT_SORT) query.set(PARAM.sort, sort);
  for (const vendor of filters.vendors) query.append(PARAM.vendor, vendor);
  for (const bracket of filters.brackets) query.append(PARAM.bracket, bracket);
  if (filters.inStock) query.set(PARAM.stock, "1");
  if (filters.premium) query.set(PARAM.premium, "1");
  if (filters.priceMin !== undefined) query.set(PARAM.min, String(filters.priceMin));
  if (filters.priceMax !== undefined) query.set(PARAM.max, String(filters.priceMax));
  if (page > 1) query.set(PARAM.page, String(page));

  return query;
}

export function hasActiveFilters(filters: CatalogueFilters): boolean {
  return (
    filters.vendors.length > 0 ||
    filters.brackets.length > 0 ||
    filters.inStock ||
    filters.premium ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined
  );
}

type Facet = "search" | "vendor" | "stock" | "premium" | "price";

/**
 * `except` retire un critere du filtrage : c'est ce qui permet de compter les
 * produits d'une facette *sans* qu'elle se compte elle-meme (cocher « Moulinex »
 * ne doit pas ramener le compteur des autres marques a zero).
 */
export function applyFilters(
  products: Product[],
  filters: CatalogueFilters,
  except?: Facet,
): Product[] {
  const tests: Record<Facet, (product: Product) => boolean> = {
    search: (product) =>
      !filters.search || matchesSearch(product.name, filters.search),
    vendor: (product) =>
      filters.vendors.length === 0 ||
      (!!product.vendor && filters.vendors.includes(product.vendor.id)),
    stock: (product) => !filters.inStock || product.stock > 0,
    premium: (product) => !filters.premium || product.isPremium,
    price: (product) => inBrackets(product, filters) && inRange(product, filters),
  };

  const active = (Object.keys(tests) as Facet[])
    .filter((facet) => facet !== except)
    .map((facet) => tests[facet]);

  return products.filter((product) => active.every((test) => test(product)));
}

export function sortProducts(
  products: Product[],
  sort: CatalogueSort,
): Product[] {
  const sorted = [...products];

  switch (sort) {
    case "populaires":
      return sorted.sort((a, b) => b.viewsCount - a.viewsCount);
    case "prix-asc":
      return sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "prix-desc":
      return sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "nom":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    default:
      // `nouveautes` : l'ordre dans lequel l'API a repondu.
      return sorted;
  }
}

// ------------------------------------------------------------------ Facettes

export type FacetOption = { value: string; label: string; count: number };

export type CatalogueFacets = {
  vendors: FacetOption[];
  brackets: FacetOption[];
  inStock: number;
  premium: number;
  /** Bornes du curseur de prix, arrondies au millier. */
  priceBounds: { min: number; max: number };
};

/**
 * Les compteurs sont calcules sur le rayon entier, pas sur la page affichee :
 * c'est ce qui oblige la page a charger tout le rayon plutot qu'a demander a
 * l'API la seule page visible.
 */
export function buildFacets(
  products: Product[],
  filters: CatalogueFilters,
): CatalogueFacets {
  const forVendors = applyFilters(products, filters, "vendor");
  const forPrice = applyFilters(products, filters, "price");
  const vendors = new Map<string, FacetOption>();

  for (const product of forVendors) {
    if (!product.vendor) continue;

    const option = vendors.get(product.vendor.id);
    if (option) option.count += 1;
    else
      vendors.set(product.vendor.id, {
        value: product.vendor.id,
        label: product.vendor.name,
        count: 1,
      });
  }

  const prices = products.map(effectivePrice);

  return {
    vendors: [...vendors.values()].sort((a, b) => b.count - a.count),
    brackets: PRICE_BRACKETS.map((bracket) => ({
      value: bracket.value,
      label: bracket.label,
      count: forPrice.filter((product) => matchesBracket(product, bracket))
        .length,
    })).filter((bracket) => bracket.count > 0),
    inStock: applyFilters(products, filters, "stock").filter(
      (product) => product.stock > 0,
    ).length,
    premium: applyFilters(products, filters, "premium").filter(
      (product) => product.isPremium,
    ).length,
    priceBounds: {
      min: floorTo(Math.min(...prices, 0), 1000),
      max: ceilTo(Math.max(...prices, 0), 1000),
    },
  };
}

// ------------------------------------------------------------------- Details

function matchesBracket(
  product: Product,
  bracket: { min: number; max?: number },
): boolean {
  const price = effectivePrice(product);
  return price >= bracket.min && (bracket.max === undefined || price < bracket.max);
}

/** Tranches cochees : elles s'additionnent (OU), comme sur un marchand. */
function inBrackets(product: Product, filters: CatalogueFilters): boolean {
  if (filters.brackets.length === 0) return true;

  return PRICE_BRACKETS.filter((bracket) =>
    filters.brackets.includes(bracket.value),
  ).some((bracket) => matchesBracket(product, bracket));
}

/** Curseur de prix : il restreint (ET) ce que les tranches ont laisse passer. */
function inRange(product: Product, filters: CatalogueFilters): boolean {
  const price = effectivePrice(product);

  if (filters.priceMin !== undefined && price < filters.priceMin) return false;
  if (filters.priceMax !== undefined && price > filters.priceMax) return false;

  return true;
}

function parseSort(value: string): CatalogueSort {
  return CATALOGUE_SORTS.some((sort) => sort.value === value)
    ? (value as CatalogueSort)
    : DEFAULT_SORT;
}

function parseAmount(value: string): number | undefined {
  const amount = Number.parseInt(value, 10);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function list(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function floorTo(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}
