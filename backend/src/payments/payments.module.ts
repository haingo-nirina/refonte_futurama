import { Module } from '@nestjs/common';
import { PAYMENT_MODE, PAYMENT_PROVIDER_NAME } from '../common/constants';
import { readManualPaymentPhone } from './manual-payment';
import { MvolaMockProvider } from './mvola-mock.provider';
import { MvolaProvider, readMvolaConfig } from './mvola.provider';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * `PAYMENT_PROVIDER` choisit le fournisseur, simulateur par defaut. Une valeur
 * inconnue empeche le demarrage plutot que de retomber en silence sur le faux
 * MVola en production. `manuel` ne fournit aucun fournisseur (`null`).
 *
 * Le simulateur est refuse en production : il valide seul chaque paiement,
 * les commandes passeraient « Payée » sans qu'un ariary soit encaisse.
 */
export function createPaymentProvider(): PaymentProvider | null {
  const name = process.env.PAYMENT_PROVIDER ?? PAYMENT_PROVIDER_NAME.MVOLA_MOCK;

  if (name === PAYMENT_PROVIDER_NAME.MVOLA_MOCK) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'PAYMENT_PROVIDER=mvola_mock interdit en production : choisir mvola ou manuel',
      );
    }
    return new MvolaMockProvider();
  }
  if (name === PAYMENT_PROVIDER_NAME.MVOLA) {
    return new MvolaProvider(readMvolaConfig());
  }
  if (name === PAYMENT_MODE.MANUEL) {
    readManualPaymentPhone();
    return null;
  }
  throw new Error(`PAYMENT_PROVIDER inconnu : ${name}`);
}

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    { provide: PAYMENT_PROVIDER, useFactory: createPaymentProvider },
  ],
})
export class PaymentsModule {}
