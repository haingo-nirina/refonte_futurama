import { MvolaMockProvider } from './mvola-mock.provider';
import { createPaymentProvider } from './payments.module';

describe('createPaymentProvider', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('garde le simulateur par defaut hors production', () => {
    delete process.env.PAYMENT_PROVIDER;
    process.env.NODE_ENV = 'development';
    expect(createPaymentProvider()).toBeInstanceOf(MvolaMockProvider);
  });

  it('refuse le simulateur en production', () => {
    delete process.env.PAYMENT_PROVIDER;
    process.env.NODE_ENV = 'production';
    expect(() => createPaymentProvider()).toThrow(/interdit en production/);
  });

  it('mode manuel : aucun fournisseur, numero de la boutique exige', () => {
    process.env.PAYMENT_PROVIDER = 'manuel';
    process.env.MVOLA_MERCHANT_MSISDN = '+261 34 12 345 67';
    expect(createPaymentProvider()).toBeNull();

    process.env.MVOLA_MERCHANT_MSISDN = '0331234567';
    expect(() => createPaymentProvider()).toThrow(/MVOLA_MERCHANT_MSISDN/);
  });
});
