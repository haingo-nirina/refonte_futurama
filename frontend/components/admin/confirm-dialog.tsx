"use client";

import { Modal } from "./modal";

/**
 * Remplace `window.confirm()` : la boite native ne se met pas aux couleurs du
 * backoffice, ne sait pas afficher d'etat d'attente et bloque le thread le
 * temps de la reponse. Ici, le bouton de confirmation reste desactive pendant
 * l'appel reseau et l'erreur s'affiche dans la modale, sans la refermer.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = "Supprimer",
  pending = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  /** Consequence a annoncer avant de cliquer, pas apres. */
  detail?: React.ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      // Une fermeture accidentelle pendant l'appel laisserait l'operation en
      // vol sans retour visible.
      onClose={pending ? () => undefined : onCancel}
      title={title}
      width="440px"
    >
      <p className="text-[13.5px]">{message}</p>

      {detail ? (
        <p className="bg-cream-deep text-muted mt-3 rounded-[10px] px-3 py-2.5 text-[12.5px]">
          {detail}
        </p>
      ) : null}

      {error ? <p className="text-brand mt-3 text-[13px]">{error}</p> : null}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="admin-button-ghost"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="admin-button"
        >
          {pending ? "Suppression…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
