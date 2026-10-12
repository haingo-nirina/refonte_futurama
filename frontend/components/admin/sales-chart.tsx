"use client";

import { useState } from "react";
import { formatPrice, toAmount } from "@/lib/format";

type Point = { key: string; revenue: string; orders: number };
type Granularity = "day" | "month";

const COMPACT = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/*
 * `timeZone: "UTC"` sur une date nue (`2026-03-12`) : le serveur et le
 * navigateur rendent le meme libelle, sans quoi l'hydratation divergerait.
 */
const DAY_SHORT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const DAY_LONG = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const MONTH_SHORT = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});
const MONTH_LONG = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Libelles par echelle. `every` : un libelle d'axe tous les N points — 30
 * dates cote a cote seraient illisibles, 12 mois tiennent.
 */
const SCALES: Record<
  Granularity,
  { short: Intl.DateTimeFormat; long: Intl.DateTimeFormat; every: number; unit: string }
> = {
  day: { short: DAY_SHORT, long: DAY_LONG, every: 7, unit: "jours" },
  month: { short: MONTH_SHORT, long: MONTH_LONG, every: 1, unit: "mois" },
};

const TICKS = 4;

/** Pas « rond » (1, 2, 5 x 10^n) pour que l'axe tombe sur des valeurs lisibles. */
function niceStep(max: number): number {
  const raw = max / TICKS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= raw) ?? 10;
  return step * magnitude;
}

/**
 * Chiffre d'affaires par jour ou par mois. Une seule serie, une seule echelle : le
 * nombre de commandes n'a pas la meme unite, il vit dans l'infobulle et dans
 * le tableau plutot que sur un second axe.
 */
export function SalesChart({
  points: days,
  granularity,
}: {
  points: Point[];
  granularity: Granularity;
}) {
  const [active, setActive] = useState<number | null>(null);
  const scale = SCALES[granularity];

  const values = days.map((day) => toAmount(day.revenue));
  const total = values.reduce((sum, value) => sum + value, 0);
  const orders = days.reduce((sum, day) => sum + day.orders, 0);
  const max = Math.max(...values, 0);
  const step = max > 0 ? niceStep(max) : 1;
  const top = step * TICKS;
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => step * i);

  const current = active === null ? null : days[active];

  return (
    <div>
      <p className="text-muted mb-4 text-[13px]">
        <strong className="font-display text-navy text-lg font-extrabold">
          {formatPrice(total)}
        </strong>{" "}
        sur {days.length} {scale.unit} · {orders} commande(s)
      </p>

      <div className="flex gap-2">
        {/* Axe Y : graduations rondes, alignees sur les lignes de la grille. */}
        <div className="text-muted-light relative h-56 w-12 shrink-0 text-right text-[11px] tabular-nums">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {COMPACT.format(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="relative h-56"
            onPointerLeave={() => setActive(null)}
          >
            {ticks.map((tick) => (
              <div
                key={tick}
                aria-hidden
                className="bg-line absolute inset-x-0 h-px"
                style={{ bottom: `${(tick / top) * 100}%` }}
              />
            ))}

            <ul className="absolute inset-0 flex items-end gap-[2px]">
              {days.map((day, index) => {
                const value = values[index];
                return (
                  <li
                    key={day.key}
                    className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none"
                    tabIndex={0}
                    aria-label={`${scale.long.format(new Date(day.key))} : ${formatPrice(value)}, ${day.orders} commande(s)`}
                    onPointerEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                  >
                    <span
                      className={`block w-full max-w-6 rounded-t-[4px] transition-opacity ${
                        active !== null && active !== index
                          ? "opacity-40"
                          : ""
                      } ${value > 0 ? "bg-navy" : ""}`}
                      style={{ height: `${(value / top) * 100}%` }}
                    />
                  </li>
                );
              })}
            </ul>

            {current && active !== null ? (
              <div
                role="status"
                className="border-line pointer-events-none absolute top-0 z-10 w-max rounded-[10px] border bg-white px-3 py-2 text-[12px] shadow-md"
                style={{
                  left: `${((active + 0.5) / days.length) * 100}%`,
                  transform: `translateX(${
                    active < days.length / 4
                      ? "0"
                      : active > (days.length * 3) / 4
                        ? "-100%"
                        : "-50%"
                  })`,
                }}
              >
                <p className="font-display text-navy text-[14px] font-extrabold">
                  {formatPrice(current.revenue)}
                </p>
                <p className="text-ink">
                  {current.orders} commande(s)
                </p>
                <p className="text-muted first-letter:uppercase">
                  {scale.long.format(new Date(current.key))}
                </p>
              </div>
            ) : null}
          </div>

          {/* Axe X : on cale le pas sur le dernier point, toujours libelle. */}
          <div className="text-muted-light mt-2 flex text-[11px]">
            {days.map((day, index) => (
              <span key={day.key} className="min-w-0 flex-1 text-center">
                {index % scale.every === (days.length - 1) % scale.every ? (
                  <span className="whitespace-nowrap">
                    {scale.short.format(new Date(day.key))}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 text-[13px]">
        <summary className="text-brand cursor-pointer font-bold">
          Voir les donnees
        </summary>
        <div className="mt-3 max-h-64 overflow-y-auto">
          <table className="w-full tabular-nums">
            <thead className="text-muted text-left text-[12px]">
              <tr>
                <th className="py-1 font-semibold">
                  {granularity === "day" ? "Jour" : "Mois"}
                </th>
                <th className="py-1 text-right font-semibold">Commandes</th>
                <th className="py-1 text-right font-semibold">CA</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {[...days].reverse().map((day) => (
                <tr key={day.key}>
                  <td className="py-1.5 first-letter:uppercase">
                    {scale.long.format(new Date(day.key))}
                  </td>
                  <td className="py-1.5 text-right">{day.orders}</td>
                  <td className="py-1.5 text-right">
                    {formatPrice(day.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
