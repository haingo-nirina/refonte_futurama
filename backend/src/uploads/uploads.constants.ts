import { join } from 'node:path';

/**
 * Racine des fichiers televerses, hors de `dist/` : un rebuild ne doit pas
 * emporter les photos des produits. Resolue depuis le repertoire de travail,
 * qui est `backend/` aussi bien sous `nest start` que sous `node dist/src/main`.
 */
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');

/**
 * Sous-dossiers autorises. La valeur arrive du client : sans cette liste
 * blanche, un `kind` fabrique a la main ecrirait hors de `UPLOADS_ROOT`.
 */
export const UPLOAD_KIND = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
} as const;

export const UPLOAD_KINDS = Object.values(UPLOAD_KIND);
export type UploadKind = (typeof UPLOAD_KIND)[keyof typeof UPLOAD_KIND];

/**
 * Prefixe HTTP sous lequel `main.ts` sert `UPLOADS_ROOT`. C'est aussi ce qui
 * est stocke en base (`ProductImage.imageUrl`), donc la valeur ne peut pas
 * changer sans migration des donnees.
 */
export const UPLOADS_PREFIX = '/uploads';

/** 5 Mo : au-dela, c'est une photo non redimensionnee sortie d'un telephone. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Types acceptes et extension associee. On ne fait jamais confiance au nom du
 * fichier envoye par le client — l'extension est deduite du type declare.
 */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};
