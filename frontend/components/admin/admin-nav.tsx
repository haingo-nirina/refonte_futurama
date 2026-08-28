"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/marques", label: "Marques" },
  { href: "/admin/avis", label: "Avis" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 lg:flex-col">
      {LINKS.map((link) => {
        // `/admin` ne doit pas rester actif sur `/admin/produits`.
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-[9px] px-3 py-2 text-[13.5px] font-semibold transition ${
              active
                ? "bg-brand text-white"
                : "text-cream/75 hover:bg-navy-soft hover:text-cream"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
