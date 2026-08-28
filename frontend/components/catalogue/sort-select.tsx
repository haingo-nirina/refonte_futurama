"use client";

import { useRouter } from "next/navigation";
import { CATALOGUE_SORTS, PARAM, type CatalogueSort } from "@/lib/catalogue";

/**
 * « Trier par » de la maquette. Le tri est un parametre d'URL comme les
 * filtres ; le `<select>` ne fait que naviguer, la page reste rendue serveur.
 */
export function SortSelect({
  basePath,
  query,
  value,
}: {
  basePath: string;
  /** Filtres courants, sans `tri` ni `page`. */
  query: string;
  value: CatalogueSort;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2.5">
      <span className="text-muted text-[13px]">Trier par</span>
      <select
        value={value}
        onChange={(event) => {
          const search = new URLSearchParams(query);
          search.set(PARAM.sort, event.target.value);
          router.push(`${basePath}?${search.toString()}`);
        }}
        className="border-line-strong text-ink hover:border-brand cursor-pointer rounded-[9px] border-[1.5px] bg-white px-4 py-2.5 text-[13.5px] font-medium"
      >
        {CATALOGUE_SORTS.map((sort) => (
          <option key={sort.value} value={sort.value}>
            {sort.label}
          </option>
        ))}
      </select>
    </label>
  );
}
