import type { Category } from "./types";

/**
 * Slug reserve du catalogue : `/catalogue/tous` liste toutes les categories.
 * C'est la cible de la recherche du header, l'API n'ayant pas de route dediee.
 */
export const ALL_CATEGORIES_SLUG = "tous";

export const PAGE_SIZE = 12;

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
