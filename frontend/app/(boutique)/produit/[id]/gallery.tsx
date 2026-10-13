"use client";

import { useState, type PointerEvent } from "react";
import { ProductImage } from "@/components/product-image";
import type { ProductImage as ProductImageType } from "@/lib/types";

export function Gallery({
  images,
  name,
}: {
  images: ProductImageType[];
  name: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];
  // Point survole, en pourcentage du cadre : sert d'origine a l'agrandissement
  // pour que la zone sous le curseur reste sous le curseur. `null` = pas de zoom.
  const [zoomOrigin, setZoomOrigin] = useState<string | null>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    // Souris uniquement : au doigt, il n'y a pas de survol et le zoom
    // resterait fige apres un simple tap.
    if (event.pointerType !== "mouse" || !active) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  }

  return (
    <div className="flex gap-3">
      {images.length > 1 ? (
        <div className="flex max-h-[520px] flex-none flex-col gap-2 overflow-y-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                setZoomOrigin(null);
              }}
              aria-label={`Visuel ${index + 1} sur ${images.length}`}
              aria-current={index === activeIndex}
              className={`h-[60px] w-[60px] flex-none overflow-hidden rounded-lg border-2 ${
                index === activeIndex ? "border-brand" : "border-line"
              }`}
            >
              <ProductImage
                src={image.imageUrl}
                alt={name}
                className="h-full w-full"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setZoomOrigin(null)}
        className={`border-line relative aspect-square flex-1 overflow-hidden rounded-2xl border bg-white ${
          zoomOrigin ? "cursor-zoom-in" : ""
        }`}
      >
        <div
          className="h-full w-full transition-transform duration-200 ease-out"
          style={{
            transform: zoomOrigin ? "scale(2)" : "scale(1)",
            transformOrigin: zoomOrigin ?? "center",
          }}
        >
          <ProductImage
            src={active?.imageUrl}
            alt={name}
            className="h-full w-full"
          />
        </div>
        {images.length > 1 ? (
          <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1.5 text-[11.5px] font-semibold text-white">
            {activeIndex + 1} / {images.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}
