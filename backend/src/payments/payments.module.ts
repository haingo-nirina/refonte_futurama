import { Module } from '@nestjs/common';
import { PAYMENT_PROVIDER_NAME } from '../common/constants';
import { MvolaMockProvider } from './mvola-mock.provider';
import { MvolaProvider, readMvolaConfig } from './mvola.provider';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * `PAYMENT_PROVIDER` choisit le fournisseur, simulateur par defaut. Une valeur
 * inconnue empeche le demarrage plutot que de retomber en silence sur le faux
 * MVola en production.
 */
function createPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? PAYMENT_PROVIDER_NAME.MVOLA_MOCK;

  if (name === PAYMENT_PROVIDER_NAME.MVOLA_MOCK) {
    return new MvolaMockProvider();
  }
  if (name === PAYMENT_PROVIDER_NAME.MVOLA) {
    return new MvolaProvider(readMvolaConfig());
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
