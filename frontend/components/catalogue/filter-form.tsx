"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

/**
 * La colonne de filtres est un formulaire GET : les criteres vivent dans
 * l'URL, donc partageable et rechargeable, et le rendu reste cote serveur.
 *
 * Le formulaire se soumet tout seul a chaque coche plutot que derriere un
 * bouton — c'est ce qu'attend un visiteur de marchand. Sans JavaScript il
 * retombe sur la soumission native et son bouton `<noscript>`.
 *
 * `page` n'est volontairement pas repris : changer un filtre ramene a la
 * premiere page, sinon on atterrit sur une page qui n'existe plus.
 */
export function FilterForm({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  // Le rendu serveur d'une page catalogue coute quelques secondes (latence
  // Aiven) : sans ce marqueur, une case cochee resterait plusieurs secondes
  // sans effet visible.
  const [pending, startTransition] = useTransition();

  function navigate() {
    if (!form.current) return;

    const query = new URLSearchParams();

    for (const [key, value] of new FormData(form.current).entries()) {
      if (typeof value === "string" && value !== "") query.append(key, value);
    }

    const suffix = query.toString();
    startTransition(() => {
      router.push(suffix ? `${basePath}?${suffix}` : basePath);
    });
  }

  return (
    <form
      ref={form}
      method="get"
      action={basePath}
      onChange={(event) => {
        // Le curseur de prix emet un evenement par pixel parcouru : il se
        // soumet lui-meme, une fois, au relachement.
        const field = event.target as unknown as HTMLElement;
        if (field instanceof HTMLInputElement && field.type === "range") return;

        navigate();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        navigate();
      }}
      aria-busy={pending}
      className={`flex flex-col gap-7 transition-opacity ${pending ? "opacity-50" : ""}`}
    >
      {children}

      <noscript>
        <button
          type="submit"
          className="bg-brand font-display rounded-full px-4 py-2 text-[12px] font-bold text-white"
        >
          Appliquer les filtres
        </button>
      </noscript>
    </form>
  );
}
