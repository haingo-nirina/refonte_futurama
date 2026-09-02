"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getAdminProducts } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import type { AdminProduct } from "@/lib/types";

/** Assez pour choisir sans noyer la liste sous le champ. */
const MAX_RESULTS = 8;

/** Le temps de finir de taper : chaque frappe partirait sinon vers Aiven. */
const DEBOUNCE_MS = 250;

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
  value,
  selectedLabel,
  onSelect,
  disabled,
}: {
  value: string;
  /** Nom du produit deja choisi, pour l'afficher sans le rechercher. */
  selectedLabel?: string;
  onSelect: (product: { id: string; name: string } | null) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Une reponse lente ne doit pas ecraser le resultat d'une frappe plus
  // recente : chaque recherche invalide la precedente.
  const latest = useRef(0);

  const term = query.trim();

  // Ce qui declenche une recherche, et donc ce qui est affichable. Derive
  // plutot que stocke : vider `results` depuis l'effet ferait une passe de
  // rendu de plus a chaque frappe, et laisserait fuir un resultat perime.
  const searching = !value && term.length >= 2;

  useEffect(() => {
    if (!searching) return;

    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      getAdminProducts({ q: term, limit: MAX_RESULTS })
        .then((page) => {
          if (ticket === latest.current) setResults(page.data);
        })
        .catch(() => {
          if (ticket === latest.current) setError("Recherche indisponible");
        })
        .finally(() => {
          if (ticket === latest.current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, searching]);

  if (value) {
    return (
      <div className="border-line flex items-center justify-between gap-3 rounded-[10px] border bg-white px-3 py-2.5">
        <span className="truncate text-[13.5px] font-semibold">
          {selectedLabel ?? "Produit selectionne"}
        </span>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            onSelect(null);
          }}
          disabled={disabled}
          className="text-brand shrink-0 text-[12.5px] font-bold hover:underline disabled:opacity-50"
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Chercher un produit par nom ou reference"
        disabled={disabled}
        aria-controls={listId}
        className="admin-input"
      />

      {loading ? (
        <p className="text-muted-light mt-1.5 text-[12px]">Recherche…</p>
      ) : null}

      {error ? <p className="text-brand mt-1.5 text-[12px]">{error}</p> : null}

      {!loading &&
      !error &&
      query.trim().length >= 2 &&
      results.length === 0 ? (
        <p className="text-muted-light mt-1.5 text-[12px]">
          Aucun produit ne correspond.
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul
          id={listId}
          className="border-line mt-1.5 max-h-56 divide-y divide-[color:var(--color-line)] overflow-y-auto rounded-[10px] border bg-white"
        >
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onSelect({ id: product.id, name: product.name })}
                className="hover:bg-cream-deep flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">
                    {product.name}
                  </span>
                  <span className="text-muted-light text-[11.5px]">
                    {product.reference ?? "sans reference"}
                    {product.isActive ? "" : " · hors ligne"}
                  </span>
                </span>
                <span className="text-muted shrink-0 text-[12px]">
                  {formatPrice(product.price)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
