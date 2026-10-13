import { MVOLA_PHONE_PATTERN, normalizeMgPhone } from './mvola-phone';

const normalize = (value: string) => normalizeMgPhone({ value }) as string;

describe('numero MVola', () => {
  it.each([
    ['034 00 000 01', '0340000001'],
    ['038.12.345.67', '0381234567'],
    ['+261 34 00 000 01', '0340000001'],
    ['261340000001', '0340000001'],
  ])('normalise « %s »', (input, expected) => {
    expect(normalize(input)).toBe(expected);
    expect(MVOLA_PHONE_PATTERN.test(normalize(input))).toBe(true);
  });

  it.each(['032 00 000 01', '033 00 000 01', '034 00 000', '0340000001 2'])(
    'refuse « %s »',
    (input) => {
      expect(MVOLA_PHONE_PATTERN.test(normalize(input))).toBe(false);
    },
  );
});
