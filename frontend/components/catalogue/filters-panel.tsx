import Link from "next/link";
import { FilterForm } from "./filter-form";
import { PriceRange } from "./price-range";
import {
  PARAM,
  hasActiveFilters,
  type CatalogueFacets,
  type CatalogueFilters,
} from "@/lib/catalogue";

type Rayon = { name: string; slug: string; active: boolean };

/**
 * Colonne de filtres de la maquette. Chaque groupe correspond a une donnee que
 * l'API renvoie reellement (vendeur, stock, selection premium, prix) : rien
 * n'est affiche qui ne filtre pas.
 */
export function FiltersPanel({
  basePath,
  filters,
  facets,
  rayons,
}: {
  basePath: string;
  filters: CatalogueFilters;
  facets: CatalogueFacets;
  rayons: Rayon[];
}) {
  const resetHref = filters.search
    ? `${basePath}?${new URLSearchParams({ [PARAM.search]: filters.search })}`
    : basePath;

  return (
    <aside>
      {/*
        Le repli ne sert qu'au mobile : a partir de `lg` la colonne est toujours
        visible et le bouton disparait. Une case a cocher plutot qu'un
        `<details>` : un `<details>` ferme n'affiche aucun de ses enfants, quoi
        qu'en dise la feuille de styles, et la colonne resterait vide sur grand
        ecran.
      */}
      <div className="border-line rounded-[12px] border bg-white p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
        <input type="checkbox" id="filtres" className="peer sr-only" />
        <label
          htmlFor="filtres"
          className="font-display text-navy peer-focus-visible:text-brand block cursor-pointer text-[13px] font-bold tracking-wide uppercase lg:hidden"
        >
          Filtres
        </label>

        <div className="mt-4 hidden peer-checked:block lg:mt-0 lg:block">
          {rayons.length > 0 ? (
            <section className="mb-7">
              <GroupTitle>Rayons</GroupTitle>
              <div className="flex flex-col gap-2">
                {rayons.map((rayon) => (
                  <Link
                    key={rayon.slug}
                    href={`/catalogue/${rayon.slug}`}
                    className={`text-[13.5px] ${
                      rayon.active
                        ? "text-brand font-semibold"
                        : "text-ink hover:text-brand"
                    }`}
                  >
                    {rayon.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <FilterForm basePath={basePath}>
            {/* La recherche du header doit survivre a un changement de filtre. */}
            {filters.search ? (
              <input
                type="hidden"
                name={PARAM.search}
                value={filters.search}
              />
            ) : null}

            {facets.marques.length > 0 ? (
              <section>
                <GroupTitle>Marques</GroupTitle>
                <div className="flex flex-col gap-2.5">
                  {facets.marques.map((marque) => (
                    <CheckRow
                      key={marque.value}
                      name={PARAM.marque}
                      value={marque.value}
                      label={marque.label}
                      count={marque.count}
                      checked={filters.marques.includes(marque.value)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <GroupTitle>Disponibilite</GroupTitle>
              <CheckRow
                name={PARAM.stock}
                value="1"
                label="En stock"
                count={facets.inStock}
                checked={filters.inStock}
              />
            </section>

            {facets.premium > 0 ? (
              <section>
                <GroupTitle>Selection premium</GroupTitle>
                <CheckRow
                  name={PARAM.premium}
                  value="1"
                  label="Produits haut de gamme"
                  count={facets.premium}
                  checked={filters.premium}
                />
              </section>
            ) : null}

            {facets.priceBounds.max > facets.priceBounds.min ? (
              <section>
                <GroupTitle>Prix (Ariary)</GroupTitle>
                <PriceRange
                  // Les bornes reviennent de l'URL : on repart d'un composant
                  // neuf plutot que de resynchroniser son etat interne.
                  key={`${filters.priceMin ?? ""}-${filters.priceMax ?? ""}-${facets.priceBounds.min}-${facets.priceBounds.max}`}
                  minName={PARAM.min}
                  maxName={PARAM.max}
                  bounds={facets.priceBounds}
                  value={{ min: filters.priceMin, max: filters.priceMax }}
                />

                <div className="mt-4 flex flex-col gap-2.5">
                  {facets.brackets.map((bracket) => (
                    <CheckRow
                      key={bracket.value}
                      name={PARAM.bracket}
                      value={bracket.value}
                      label={bracket.label}
                      count={bracket.count}
                      checked={filters.brackets.includes(bracket.value)}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </FilterForm>

          {hasActiveFilters(filters) ? (
            <Link
              href={resetHref}
              className="text-brand mt-7 inline-block text-[12px] font-medium"
            >
              Tout decocher
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-navy mb-3 text-[13px] font-bold tracking-wide uppercase">
      {children}
    </h2>
  );
}

function CheckRow({
  name,
  value,
  label,
  count,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  count: number;
  checked: boolean;
}) {
  const disabled = count === 0 && !checked;

  return (
    <label
      className={`flex items-center gap-2.5 ${disabled ? "opacity-45" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        disabled={disabled}
        className="border-line-strong checked:border-brand checked:bg-brand h-4 w-4 flex-none appearance-none rounded-[4px] border-[1.5px] bg-white bg-[length:11px] bg-center bg-no-repeat checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22white%22><path d=%22M6.2 11.6 3 8.4l1.1-1.1 2.1 2.1 5-5L12.3 5z%22/></svg>')]"
      />
      <span className="text-ink flex-1 text-[13.5px]">{label}</span>
      <span className="text-muted-light text-[12px]">{count}</span>
    </label>
  );
}
