/**
 * Numero MVola : uniquement les prefixes Telma 034 et 038.
 * Forme stockee : 10 chiffres sans separateur (0341234567).
 */
export const MVOLA_PHONE_PATTERN = /^03[48]\d{7}$/;

/**
 * A poser avec `@Transform(normalizeMgPhone)` : retire espaces, points, tirets
 * et parentheses, et ramene l'indicatif +261 / 261 au 0 national. La saisie
 * « +261 34 00 000 01 » devient « 0340000001 » avant validation.
 */
export const normalizeMgPhone = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;

  const digits = value.replace(/[\s.\-()]/g, '');

  return digits.replace(/^\+?261/, '0');
};
