"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

/**
 * Curseur a deux poignees de la maquette. Les deux `input[type=range]` sont
 * superposes sur la meme piste : seules leurs poignees captent le pointeur
 * (`pointer-events`), sans quoi celui du dessus avalerait tous les clics.
 *
 * Les valeurs ne partent dans l'URL que si elles s'ecartent des bornes du
 * rayon — un curseur laisse au repos ne doit rien ajouter a l'adresse.
 */
export function PriceRange({
  minName,
  maxName,
  bounds,
  value,
}: {
  minName: string;
  maxName: string;
  bounds: { min: number; max: number };
  value: { min?: number; max?: number };
}) {
  const [low, setLow] = useState(value.min ?? bounds.min);
  const [high, setHigh] = useState(value.max ?? bounds.max);
  // Le formulaire n'est soumis qu'apres le rendu portant les nouvelles bornes,
  // sinon `FormData` lirait les champs caches d'avant le deplacement.
  const [commits, setCommits] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (commits === 0) return;
    root.current?.closest("form")?.requestSubmit();
  }, [commits]);

  const span = Math.max(1, bounds.max - bounds.min);
  const lowPercent = ((low - bounds.min) / span) * 100;
  const highPercent = ((high - bounds.min) / span) * 100;
  const step = Math.max(1000, Math.round(span / 100 / 1000) * 1000);

  return (
    <div ref={root}>
      {low > bounds.min ? (
        <input type="hidden" name={minName} value={low} />
      ) : null}
      {high < bounds.max ? (
        <input type="hidden" name={maxName} value={high} />
      ) : null}

      <div className="relative flex h-5 items-center">
        <span className="bg-line-strong absolute inset-x-0 h-[3px] rounded-full" />
        <span
          className="bg-brand absolute h-[3px] rounded-full"
          style={{ left: `${lowPercent}%`, right: `${100 - highPercent}%` }}
        />

        <input
          type="range"
          aria-label="Prix minimum"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={low}
          onChange={(event) =>
            setLow(Math.min(Number(event.target.value), high))
          }
          onPointerUp={() => setCommits((count) => count + 1)}
          onKeyUp={() => setCommits((count) => count + 1)}
          className={THUMB}
        />
        <input
          type="range"
          aria-label="Prix maximum"
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={high}
          onChange={(event) =>
            setHigh(Math.max(Number(event.target.value), low))
          }
          onPointerUp={() => setCommits((count) => count + 1)}
          onKeyUp={() => setCommits((count) => count + 1)}
          className={THUMB}
        />
      </div>

      <div className="text-ink mt-2.5 flex justify-between text-[12.5px] font-medium">
        <span>{formatPrice(low)}</span>
        <span>{formatPrice(high)}</span>
      </div>
    </div>
  );
}

const THUMB = [
  "pointer-events-none absolute inset-x-0 h-5 w-full appearance-none bg-transparent",
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-grab",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px]",
  "[&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:bg-white",
  "[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,.25)]",
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
  "[&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-brand [&::-moz-range-thumb]:bg-white",
  "[&::-moz-range-track]:bg-transparent",
].join(" ");
