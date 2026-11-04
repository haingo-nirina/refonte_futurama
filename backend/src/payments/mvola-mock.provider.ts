import { PAYMENT_PROVIDER_NAME } from '../common/constants';
import type {
  PaymentOutcome,
  PaymentProvider,
  PaymentRequest,
  PaymentRequestResult,
} from './payment-provider';

/**
 * Faux MVola, pour developper tout le parcours sans les acces de l'API : rien
 * n'est appele, aucun argent ne bouge. Le paiement est accepte, sauf pour un
 * numero qui finit par 99 — de quoi tester l'echec a la main.
 */
export class MvolaMockProvider implements PaymentProvider {
  readonly name = PAYMENT_PROVIDER_NAME.MVOLA_MOCK;

  request(payment: PaymentRequest): Promise<PaymentRequestResult> {
    return Promise.resolve({
      providerRef: `mock-${payment.reference}`,
      simulatedOutcome: mockOutcome(payment.phone),
    });
  }
}

export function mockOutcome(phone: string): PaymentOutcome {
  if (phone.endsWith('99')) {
    return {
      success: false,
      reason: 'Paiement refusé (simulation : numéro en 99)',
      raw: { simulated: true, status: 'failed' },
    };
  }

  return { success: true, raw: { simulated: true, status: 'completed' } };
}
