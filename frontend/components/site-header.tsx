import Link from "next/link";
import { getCategories } from "@/lib/api";
import type { Category } from "@/lib/types";
import { CartBadge } from "./cart-badge";
import { SearchForm } from "./search-form";

/**
 * Le header est rendu sur toutes les pages : si l'API est injoignable, il doit
 * degrader (menu vide) plutot que faire tomber le site entier.
 */
async function loadTopCategories(): Promise<Category[]> {
  try {
    const categories = await getCategories();
    return categories.filter((category) => category.parentId === null);
  } catch {
    return [];
  }
}

export async function SiteHeader() {
  const categories = await loadTopCategories();

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="bg-brand px-4 py-2 text-center text-[13px] font-medium text-white">
        Livraison offerte dans Antananarivo des 300 000 Ar — Retrait gratuit a
        Tsaralalana
      </div>

      <div className="border-line flex flex-wrap items-center gap-6 border-b px-4 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-display text-navy text-2xl font-extrabold tracking-tight">
            FUTURAMA
          </span>
          <span className="text-brand mt-1.5 font-mono text-[9px] tracking-[0.22em]">
            IMPORTATEUR DIRECT · MADAGASCAR
          </span>
        </Link>

        <SearchForm className="order-last w-full md:order-none md:max-w-lg md:flex-1" />

        <div className="ml-auto flex items-center gap-6">
          <div className="hidden flex-col gap-0.5 lg:flex">
            <span className="text-muted text-[11px]">
              Commande par telephone
            </span>
            <span className="font-display text-navy text-[15px] font-bold">
              +261 32 69 521 24
            </span>
          </div>
          <CartBadge />
        </div>
      </div>

      <nav className="border-line flex items-stretch gap-1 overflow-x-auto border-b px-4 sm:px-8 lg:px-12">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/catalogue/${category.slug}`}
            className="text-ink hover:border-brand hover:text-brand border-b-2 border-transparent px-4 py-4 text-[13.5px] font-medium whitespace-nowrap"
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
