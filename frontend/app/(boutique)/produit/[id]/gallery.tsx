"use client";

import { useState } from "react";
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

  return (
    <div className="flex gap-3">
      {images.length > 1 ? (
        <div className="flex max-h-[520px] flex-none flex-col gap-2 overflow-y-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
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

      <div className="border-line relative aspect-square flex-1 overflow-hidden rounded-2xl border bg-white">
        <ProductImage
          src={active?.imageUrl}
          alt={name}
          className="h-full w-full"
        />
        {images.length > 1 ? (
          <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1.5 text-[11.5px] font-semibold text-white">
            {activeIndex + 1} / {images.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}
