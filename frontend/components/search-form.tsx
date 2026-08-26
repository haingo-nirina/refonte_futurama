"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ALL_CATEGORIES_SLUG } from "@/lib/catalogue";

/**
 * L'API n'expose pas de recherche : `GET /products` ne filtre pas sur le nom.
 * La recherche renvoie donc vers le catalogue complet, qui filtre les noms
 * cote serveur sur le jeu de produits qu'il a charge.
 */
export function SearchForm({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  return (
    <form
      className={`border-line-strong flex items-center overflow-hidden rounded-[10px] border-[1.5px] ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const query = term.trim();
        router.push(
          `/catalogue/${ALL_CATEGORIES_SLUG}${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        );
      }}
    >
      <input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        aria-label="Rechercher un produit"
        placeholder="Rechercher un produit…"
        className="text-ink min-w-0 flex-1 px-4 py-3 text-sm outline-none"
      />
      <button
        type="submit"
        className="bg-navy hover:bg-navy-soft px-5 py-3 text-[13.5px] font-bold text-white"
      >
        Chercher
      </button>
    </form>
  );
}
