"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ApiError } from "@/lib/api";
import { deleteProducts } from "@/lib/admin-api";

/**
 * Selection multiple de la liste produits. Le tableau reste un Server
 * Component : seules les cases a cocher et la barre d'actions sont clientes,
 * reliees par ce contexte.
 *
 * Deux niveaux, comme une messagerie : cocher l'en-tete selectionne la page ;
 * un second clic, dans la barre, etend a **tous** les produits correspondant
 * aux filtres — ce que le backend supprime sans qu'on ait a en connaitre les
 * identifiants.
 */

type Filters = { q?: string; categoryId?: string; isActive?: boolean };

type SelectionState = {
  pageIds: string[];
  selected: Set<string>;
  allMatching: boolean;
  toggle: (id: string) => void;
  togglePage: () => void;
};

const SelectionContext = createContext<SelectionState | null>(null);

function useSelection(): SelectionState {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("A utiliser sous <ProductSelectionProvider>");
  }
  return context;
}

type BarState = {
  total: number;
  filters: Filters;
  selectMatching: () => void;
  clear: () => void;
};

const BarContext = createContext<BarState | null>(null);

/**
 * A remonter (`key`) a chaque changement de page ou de filtre : une selection
 * ne doit jamais survivre a une liste qu'on n'a plus sous les yeux.
 */
export function ProductSelectionProvider({
  pageIds,
  total,
  filters,
  children,
}: {
  pageIds: string[];
  total: number;
  filters: Filters;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [allMatching, setAllMatching] = useState(false);

  function toggle(id: string) {
    setAllMatching(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setAllMatching(false);
    setSelected((current) =>
      pageIds.every((id) => current.has(id)) ? new Set() : new Set(pageIds),
    );
  }

  function clear() {
    setAllMatching(false);
    setSelected(new Set());
  }

  // Apres un `router.refresh()`, les lignes supprimees disparaissent de la
  // page : on ne garde coche que ce qui est encore affiche.
  const visible = new Set(pageIds.filter((id) => selected.has(id)));

  return (
    <SelectionContext.Provider
      value={{ pageIds, selected: visible, allMatching, toggle, togglePage }}
    >
      <BarContext.Provider
        value={{
          total,
          filters,
          selectMatching: () => {
            setSelected(new Set(pageIds));
            setAllMatching(true);
          },
          clear,
        }}
      >
        {children}
      </BarContext.Provider>
    </SelectionContext.Provider>
  );
}

export function ProductSelectAll() {
  const { pageIds, selected, allMatching, togglePage } = useSelection();
  const ref = useRef<HTMLInputElement>(null);

  const checked =
    allMatching ||
    (pageIds.length > 0 && pageIds.every((id) => selected.has(id)));
  const indeterminate = !checked && selected.size > 0;

  // `indeterminate` n'existe qu'en propriete DOM, pas en attribut HTML.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={togglePage}
      aria-label="Selectionner tous les produits de la page"
      className="size-4 cursor-pointer align-middle"
    />
  );
}

export function ProductSelectCheckbox({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const { selected, allMatching, toggle } = useSelection();

  return (
    <input
      type="checkbox"
      checked={allMatching || selected.has(id)}
      onChange={() => toggle(id)}
      aria-label={`Selectionner ${name}`}
      className="size-4 cursor-pointer align-middle"
    />
  );
}

export function ProductBulkBar() {
  const router = useRouter();
  const { pageIds, selected, allMatching } = useSelection();
  const bar = useContext(BarContext);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bar || (selected.size === 0 && !allMatching)) return null;

  const { total, filters, selectMatching, clear } = bar;
  const count = allMatching ? total : selected.size;
  const pageFullySelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const hasFilters = Boolean(
    filters.q || filters.categoryId || filters.isActive !== undefined,
  );

  async function onDelete() {
    setPending(true);
    setError(null);

    try {
      await deleteProducts(
        allMatching ? { all: true, ...filters } : { ids: [...selected] },
      );
      setConfirming(false);
      clear();
      // La page est un Server Component : c'est au serveur de relire la liste.
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Suppression impossible",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="border-line bg-cream-deep mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border px-4 py-3 text-[13.5px]">
        <span className="font-semibold">
          {allMatching
            ? `Les ${total} produit(s) ${hasFilters ? "correspondant aux filtres" : "du catalogue"} sont selectionnes.`
            : `${count} produit(s) selectionne(s).`}
        </span>

        {!allMatching && pageFullySelected && total > pageIds.length ? (
          <button
            type="button"
            onClick={selectMatching}
            className="text-navy hover:text-brand font-bold underline"
          >
            Selectionner les {total} produits
            {hasFilters ? " correspondant aux filtres" : ""}
          </button>
        ) : null}

        <button
          type="button"
          onClick={clear}
          className="text-muted hover:text-ink font-bold"
        >
          Tout deselectionner
        </button>

        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="admin-button ml-auto"
        >
          Supprimer ({count})
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Supprimer ${count} produit(s) ?`}
        message={
          allMatching && !hasFilters ? (
            <>
              <strong>Tout le catalogue</strong> sera supprime ({total}{" "}
              produits), avec les galeries, caracteristiques, avis et produits
              lies.
            </>
          ) : (
            <>
              <strong>{count} produit(s)</strong> seront retires du catalogue,
              avec leur galerie, leurs caracteristiques, leurs avis et leurs
              produits lies.
            </>
          )
        }
        detail="Les commandes deja passees ne bougent pas : elles gardent le nom et le prix figes au moment de l'achat. Cette action est definitive."
        confirmLabel={`Supprimer ${count} produit(s)`}
        pending={pending}
        error={error}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
