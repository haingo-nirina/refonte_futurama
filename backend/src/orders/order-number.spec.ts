import { formatOrderNumber } from './order-number';

describe('formatOrderNumber', () => {
  it('complete la sequence sur six chiffres', () => {
    expect(formatOrderNumber(2026, 123)).toBe('FUT-2026-000123');
  });
});
