import { MVOLA_PHONE_PATTERN, normalizeMgPhone } from '../common/mvola-phone';

/**
 * Numero MVola de la boutique, affiche au client en mode manuel pour qu'il y
 * envoie son paiement. Le meme que celui qui encaisse avec l'API. Un numero
 * absent ou invalide empeche le demarrage : le client ne saurait pas ou payer.
 */
export function readManualPaymentPhone(): string {
  const phone = normalizeMgPhone({
    value: process.env.MVOLA_MERCHANT_MSISDN?.trim() ?? '',
  }) as string;
  if (!MVOLA_PHONE_PATTERN.test(phone)) {
    throw new Error(
      'MVOLA_MERCHANT_MSISDN manquant ou invalide (PAYMENT_PROVIDER=manuel)',
    );
  }
  return phone;
}
