import { Prisma } from '@prisma/client';
import { shippingFeeFor } from './shipping-fee';

const D = (value: string | number) => new Prisma.Decimal(value);

describe('shippingFeeFor', () => {
  const antananarivo = { price: D(5000), freeThreshold: D(300000) };
  const province = { price: D(25000), freeThreshold: null };

  it('facture le prix de la zone sous le seuil', () => {
    expect(shippingFeeFor(antananarivo, D(299999)).toString()).toBe('5000');
  });

  it('offre la livraison des que le seuil est atteint', () => {
    expect(shippingFeeFor(antananarivo, D(300000)).toString()).toBe('0');
  });

  it('facture toujours une zone sans seuil', () => {
    expect(shippingFeeFor(province, D(10000000)).toString()).toBe('25000');
  });
});
