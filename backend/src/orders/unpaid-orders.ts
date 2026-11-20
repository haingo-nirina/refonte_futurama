/** Delai par defaut avant l'annulation d'une commande jamais payee. */
export const DEFAULT_UNPAID_ORDER_CANCEL_HOURS = 24;

/**
 * Delai avant qu'une commande restee « En attente de paiement » soit annulee
 * et son stock rendu. `UNPAID_ORDER_CANCEL_HOURS` dans `process.env`, comme
 * `JWT_SECRET` ; `0` desactive l'annulation automatique. Une valeur illisible
 * empeche le demarrage plutot que d'annuler au mauvais moment.
 *
 * `null` = desactive.
 */
export function readUnpaidOrderTtlMs(): number | null {
  const raw = process.env.UNPAID_ORDER_CANCEL_HOURS?.trim();
  if (!raw) return DEFAULT_UNPAID_ORDER_CANCEL_HOURS * 60 * 60 * 1000;

  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error(
      `UNPAID_ORDER_CANCEL_HOURS invalide : ${raw} (nombre d'heures, 0 pour desactiver)`,
    );
  }

  return hours === 0 ? null : hours * 60 * 60 * 1000;
}
