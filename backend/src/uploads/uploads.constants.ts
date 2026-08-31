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
  MARQUES: 'marques',
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
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * 50 Mo : une demonstration produit, pas un film. La limite est aussi ce que
 * multer garde en memoire pendant le televersement (voir `uploads.service.ts`)
 * — la relever coute directement de la RAM au serveur.
 */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

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

/**
 * Formats video acceptes. Meme regle que pour les images : l'extension vient
 * du type declare, jamais du nom envoye par le client. Volontairement reduit
 * aux formats qu'un `<video>` sait lire sans transcodage.
 */
export const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

/**
 * Sous-dossier des videos. Contrairement aux images, il n'est pas choisi par
 * le client : une video n'est rattachee qu'a un produit (`Product.videoUrl`).
 */
export const VIDEOS_DIRECTORY = 'videos';
