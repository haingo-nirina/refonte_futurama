"use client";

import { useEffect, useRef } from "react";

/**
 * Modale du backoffice, batie sur `<dialog>` natif plutot que sur une div en
 * position fixe : le navigateur fournit alors le piegeage du focus, la
 * fermeture par Echap et l'inertie du reste de la page. Rien de tout ca n'est
 * gratuit a reimplementer correctement.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "560px",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // `showModal()` et `close()` sont imperatifs : on les synchronise sur la
    // prop plutot que de les appeler depuis les gestionnaires d'evenements.
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Echap declenche `cancel` : on le detourne pour passer par `onClose` et
      // garder un seul chemin de fermeture.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // La cible n'est le `<dialog>` lui-meme que sur l'arriere-plan : son
      // contenu remplit toute sa boite (padding 0).
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      style={{ width: `min(${width}, calc(100vw - 2rem))` }}
      className="backdrop:bg-navy/45 text-ink m-auto max-h-[calc(100dvh-3rem)] overflow-visible rounded-[16px] border-0 bg-transparent p-0"
    >
      <div className="border-line flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-[16px] border bg-white">
        <header className="border-line flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-navy text-[16px] font-extrabold">
              {title}
            </h2>
            {description ? (
              <p className="text-muted mt-1 text-[12.5px]">{description}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-muted hover:bg-cream-deep hover:text-brand -mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-[8px] text-xl leading-none transition"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
