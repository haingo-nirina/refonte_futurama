import { readUnpaidOrderTtlMs } from './unpaid-orders';

const HOUR = 60 * 60 * 1000;

describe('readUnpaidOrderTtlMs', () => {
  const saved = process.env.UNPAID_ORDER_CANCEL_HOURS;

  afterEach(() => {
    if (saved === undefined) delete process.env.UNPAID_ORDER_CANCEL_HOURS;
    else process.env.UNPAID_ORDER_CANCEL_HOURS = saved;
  });

  it('vaut 24 h sans variable', () => {
    delete process.env.UNPAID_ORDER_CANCEL_HOURS;
    expect(readUnpaidOrderTtlMs()).toBe(24 * HOUR);
  });

  it('lit le nombre d heures', () => {
    process.env.UNPAID_ORDER_CANCEL_HOURS = '72';
    expect(readUnpaidOrderTtlMs()).toBe(72 * HOUR);
  });

  it('0 desactive', () => {
    process.env.UNPAID_ORDER_CANCEL_HOURS = '0';
    expect(readUnpaidOrderTtlMs()).toBeNull();
  });

  it('refuse une valeur illisible', () => {
    process.env.UNPAID_ORDER_CANCEL_HOURS = 'un jour';
    expect(() => readUnpaidOrderTtlMs()).toThrow('UNPAID_ORDER_CANCEL_HOURS');
  });
});
