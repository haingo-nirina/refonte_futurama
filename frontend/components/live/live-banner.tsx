"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentLive } from "@/lib/use-current-live";

/** Bandeau du header, visible seulement pendant un live Facebook. */
export function LiveBanner() {
  const live = useCurrentLive();
  const pathname = usePathname();

  // Sur `/live`, le lecteur est deja sous les yeux du visiteur.
  if (!live || pathname === "/live") return null;

  return (
    <Link
      href="/live"
      className="block bg-red-600 px-4 py-2 text-center text-[13px] font-bold text-white hover:bg-red-700"
    >
      🔴 Live en cours{live.title ? ` : ${live.title}` : ""} — Regarder
    </Link>
  );
}
