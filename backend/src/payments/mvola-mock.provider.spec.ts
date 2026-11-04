import { Prisma } from '@prisma/client';
import { MvolaMockProvider, mockOutcome } from './mvola-mock.provider';

describe('MvolaMockProvider', () => {
  it('accepte un numero ordinaire', () => {
    expect(mockOutcome('0341234567').success).toBe(true);
  });

  it('refuse un numero qui finit par 99', () => {
    const outcome = mockOutcome('0341234599');
    expect(outcome.success).toBe(false);
    expect(outcome.reason).toBeDefined();
  });

  it('derive sa reference de la notre', async () => {
    const result = await new MvolaMockProvider().request({
      reference: 'abc',
      amount: new Prisma.Decimal(1000),
      phone: '0341234567',
      description: 'Commande FUT-2026-000001',
    });
    expect(result.providerRef).toBe('mock-abc');
    expect(result.simulatedOutcome?.success).toBe(true);
  });
});
