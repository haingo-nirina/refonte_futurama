"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ProductImage } from "@/components/product-image";
import { getAdminProducts } from "@/lib/admin-api";
import { formatPrice, promotionDiscountLabel } from "@/lib/format";
import type { AdminProduct } from "@/lib/types";

/** Assez pour choisir sans noyer la liste sous le champ. */
const PAGE_SIZE = 8;

/** Plafond du DTO backend : au-dela, l'API repondrait 400. */
const API_MAX_LIMIT = 100;

/** Le temps de finir de taper : chaque frappe partirait sinon vers Aiven. */
const DEBOUNCE_MS = 250;

/**
 * Ce que le picker rend a son appelant, et ce qu'il lui suffit d'avoir pour
 * reafficher la selection sans la rechercher. Volontairement plus large qu'un
 * `{ id, name }` : la carte de selection montre le visuel et le prix, c'est ce
 * qui confirme d'un coup d'oeil quel produit va etre remise.
 */
export type PickedProduct = {
  id: string;
  name: string;
  price: string;
  reference?: string | null;
  images?: { imageUrl: string }[];
  activePromotion?: { id: string; discountPercent: string } | null;
};

/** Vignette + nom + reference + prix : la ligne de resultat et la carte. */
function ProductLine({
  product,
  promotionLabel,
}: {
  product: PickedProduct;
  promotionLabel: string | null;
}) {
  // `undefined` = la reference n'est pas connue de l'appelant (la promotion
  // ne la joint pas), `null` = le produit n'en a pas. Les deux cas different :
  // le premier ne doit rien afficher.
  const reference =
    product.reference === undefined
      ? null
      : (product.reference ?? "sans reference");

  return (
    <>
      <ProductImage
        src={product.images?.[0]?.imageUrl}
        alt={product.name}
        className="border-line size-11 shrink-0 rounded-[8px] border !text-base"
      />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">
          {product.name}
        </span>
        {reference || promotionLabel ? (
          <span className="text-muted-light block truncate text-[11.5px]">
            {reference}
            {reference && promotionLabel ? " · " : null}
            {promotionLabel ? (
              <span className="text-tint-warm-ink font-semibold">
                deja en promo {promotionLabel}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>

      <span className="text-muted shrink-0 text-[12px] font-semibold">
        {formatPrice(product.price)}
      </span>
    </>
  );
}

/**
 * Choix d'un produit par recherche, adosse a `GET /products?q=` (nom et
 * reference, insensible a la casse).
 *
 * Une liste deroulante ne convenait plus : le selecteur des produits lies
 * charge 100 produits d'un coup, ce qui tient tant que le catalogue est petit.
 * Ici la recherche part au serveur, et le catalogue peut grossir.
 *
 * L'appel passe par `getAdminProducts` et non par la lecture publique : une
 * promotion doit pouvoir viser un produit encore depublie, le temps de le
 * preparer.
 */
export function ProductPicker({
  selected,
  onSelect,
  disabled,
  ignorePromotionId,
}: {
  selected: PickedProduct | null;
  onSelect: (product: PickedProduct | null) => void;
  disabled?: boolean;
  /**
   * Promotion en cours d'edition : c'est elle qui rend son propre produit
   * « deja en promo ». La signaler serait un faux conflit.
   */
  ignorePromotionId?: string;
}) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-${index}`;

  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);

  // Les resultats portent le terme qui les a produits : sans lui, la liste de
  // la frappe precedente resterait affichee pendant tout le debounce.
  const [results, setResults] = useState<{
    term: string;
    items: AdminProduct[];
    total: number;
  } | null>(null);

  // Une reponse lente ne doit pas ecraser le resultat d'une frappe plus
  // recente : chaque recherche invalide la precedente.
  const latest = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  const term = query.trim();

  // Ce qui declenche une recherche, et donc ce qui est affichable. Derive
  // plutot que stocke : vider `results` depuis l'effet ferait une passe de
  // rendu de plus a chaque frappe, et laisserait fuir un resultat perime.
  const searching = !selected && term.length >= 2;
  const matching = results?.term === term ? results : null;
  const items = searching && matching ? matching.items : [];

  useEffect(() => {
    if (!searching) return;

    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      getAdminProducts({ q: term, limit })
        .then((page) => {
          if (ticket !== latest.current) return;
          setResults({ term, items: page.data, total: page.meta.total });
          setHighlight(0);
        })
        .catch(() => {
          if (ticket === latest.current) setError("Recherche indisponible");
        })
        .finally(() => {
          if (ticket === latest.current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, searching, limit]);

  /** `null` quand la promotion en cours d'edition est celle du produit. */
  function promotionLabel(product: PickedProduct): string | null {
    const promotion = product.activePromotion;
    if (!promotion || promotion.id === ignorePromotionId) return null;

    return promotionDiscountLabel(promotion.discountPercent);
  }

  function choose(product: AdminProduct) {
    setQuery("");
    setResults(null);
    onSelect(product);
  }

  /**
   * Le champ vit dans un formulaire : sans `preventDefault`, Entree
   * enregistrerait la promotion au lieu de retenir le produit surligne.
   */
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && searching) {
      // La modale est un `<dialog>` natif : sans cela, Echap la fermerait
      // au lieu de ne refermer que la liste.
      event.preventDefault();
      setQuery("");
      return;
    }

    if (items.length === 0) {
      // Une recherche en cours ne doit pas non plus soumettre le formulaire.
      if (event.key === "Enter" && searching) event.preventDefault();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => (current + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => (current - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(items[highlight]);
    }
  }

  // Le surlignage se deplace au clavier : la ligne visee doit suivre dans la
  // liste, qui deborde des la cinquieme.
  useEffect(() => {
    const option = listRef.current?.children[highlight];
    option?.scrollIntoView({ block: "nearest" });
  }, [highlight, items.length]);

  if (selected) {
    const label = promotionLabel(selected);

    return (
      <div className="border-line rounded-[10px] border bg-white p-2.5">
        <div className="flex items-center gap-3">
          <ProductLine product={selected} promotionLabel={label} />
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
              onSelect(null);
            }}
            disabled={disabled}
            className="text-brand shrink-0 text-[12.5px] font-bold hover:underline disabled:opacity-50"
          >
            Changer
          </button>
        </div>

        {label ? (
          <p className="text-tint-warm-ink mt-2 text-[11.5px]">
            Ce produit porte deja une promotion {label} : deux promotions
            actives ne peuvent pas se chevaucher.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          // Chaque nouveau terme repart d'une premiere page.
          setLimit(PAGE_SIZE);
        }}
        onKeyDown={onKeyDown}
        placeholder="Chercher un produit par nom ou reference"
        disabled={disabled}
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          items.length > 0 ? optionId(highlight) : undefined
        }
        className="admin-input"
      />

      {loading ? (
        <p className="text-muted-light mt-1.5 text-[12px]">Recherche…</p>
      ) : null}

      {error ? <p className="text-brand mt-1.5 text-[12px]">{error}</p> : null}

      {!loading && !error && searching && matching && items.length === 0 ? (
        <p className="text-muted-light mt-1.5 text-[12px]">
          Aucun produit ne correspond.
        </p>
      ) : null}

      {items.length > 0 ? (
        <>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="border-line mt-1.5 max-h-64 divide-y divide-[color:var(--color-line)] overflow-y-auto rounded-[10px] border bg-white"
          >
            {items.map((product, index) => (
              <li
                key={product.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === highlight}
              >
                <button
                  type="button"
                  onClick={() => choose(product)}
                  // La souris prend la main sur le surlignage clavier, sinon
                  // deux lignes paraitraient visees en meme temps.
                  onMouseEnter={() => setHighlight(index)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                    index === highlight ? "bg-cream-deep" : ""
                  }`}
                >
                  <ProductLine
                    product={product}
                    promotionLabel={promotionLabel(product)}
                  />
                  {product.isActive ? null : (
                    <span className="text-muted-light shrink-0 text-[11.5px]">
                      hors ligne
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {matching && matching.total > items.length ? (
            <div className="text-muted-light mt-1.5 flex items-center justify-between gap-3 text-[12px]">
              <span>
                {items.length} sur {matching.total} resultats
              </span>
              {limit < API_MAX_LIMIT ? (
                <button
                  type="button"
                  onClick={() =>
                    setLimit((current) =>
                      Math.min(current + PAGE_SIZE, API_MAX_LIMIT),
                    )
                  }
                  disabled={loading}
                  className="text-navy hover:text-brand font-bold disabled:opacity-50"
                >
                  Voir plus
                </button>
              ) : (
                <span>Affinez la recherche</span>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
