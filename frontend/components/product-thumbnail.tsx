"use client";

import { useState } from "react";
import type { ProductImage as ProductImageType } from "@/lib/types";
import { ProductImage } from "./product-image";

/**
 * Vignette de la grille catalogue : la galerie de la maquette, reduite a ses
 * pastilles. Le lien vers la fiche est pose en surimpression par la carte,
 * les pastilles passent au-dessus — un `<button>` ne peut pas vivre dans un
 * `<a>`.
 */
export function ProductThumbnail({
  images,
  alt,
}: {
  images: ProductImageType[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  return (
    <>
      <ProductImage
        src={current?.imageUrl}
        alt={alt}
        className="h-full w-full"
      />

      {images.length > 1 ? (
        <div className="absolute inset-x-0 bottom-2 z-[2] flex justify-center gap-[5px]">
          {images.map((image, position) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Visuel ${position + 1}`}
              onClick={() => setIndex(position)}
              className={`h-[5px] w-[5px] rounded-full shadow-[0_0_0_1px_rgba(0,0,0,.18)] ${
                position === index ? "bg-navy" : "bg-white"
              }`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
