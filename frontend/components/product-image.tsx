"use client";

import { useState } from "react";

/**
 * Le seed reference des visuels (`/images/products/...jpg`) qui ne sont pas
 * encore livres dans `public/`. Plutot qu'une icone d'image cassee, on retombe
 * sur un aplat portant l'initiale du produit.
 */
export function ProductImage({
  src,
  alt,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  // On memorise l'URL en echec, pas un booleen : le composant est reutilise
  // d'une carte a l'autre lors des navigations, et un simple drapeau
  // condamnerait le visuel suivant sans qu'on ait a le reinitialiser.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div
        aria-hidden
        className={`bg-cream-deep text-navy/20 font-display flex items-center justify-center text-3xl font-extrabold select-none ${className}`}
      >
        {alt.trim().charAt(0).toUpperCase() || "?"}
      </div>
    );
  }

  return (
    // Visuels non servis par l'app (chemins issus du seed) : next/image n'a
    // rien a optimiser ici et exigerait une configuration de loader.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      // `onError` n'existe qu'apres l'hydratation : une image deja tombee en
      // 404 pendant le rendu serveur ne le declencherait jamais et resterait
      // affichee cassee. On rattrape le cas au montage.
      ref={(node) => {
        if (node?.complete && node.naturalWidth === 0) setFailedSrc(src);
      }}
      className={`object-cover ${className}`}
    />
  );
}
