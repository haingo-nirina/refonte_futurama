import { BadRequestException, type ValidationError } from '@nestjs/common';

/**
 * Messages par defaut de class-validator, traduits. Un message ecrit dans un
 * DTO (`{ message: '...' }`, deja en francais) ne correspond a aucun motif et
 * passe tel quel.
 */
const TRANSLATIONS: [RegExp, (field: string, ...args: string[]) => string][] = [
  [/^\S+ should not be empty$/, (f) => `« ${f} » est obligatoire`],
  [/^\S+ must be a string$/, (f) => `« ${f} » doit être un texte`],
  [
    /^\S+ must be an integer number$/,
    (f) => `« ${f} » doit être un nombre entier`,
  ],
  [
    /^\S+ must be a number conforming to the specified constraints$/,
    (f) => `« ${f} » doit être un nombre`,
  ],
  [
    /^\S+ must not be less than (.+)$/,
    (f, n) => `« ${f} » doit être supérieur ou égal à ${n}`,
  ],
  [
    /^\S+ must not be greater than (.+)$/,
    (f, n) => `« ${f} » doit être inférieur ou égal à ${n}`,
  ],
  [/^\S+ must be a UUID$/, (f) => `« ${f} » n'est pas un identifiant valide`],
  [
    /^\S+ must be one of the following values: (.*)$/,
    (f, values) => `« ${f} » doit valoir : ${values}`,
  ],
  [
    /^\S+ must be shorter than or equal to (\d+) characters$/,
    (f, n) => `« ${f} » doit faire au plus ${n} caractères`,
  ],
  [
    /^\S+ must be longer than or equal to (\d+) characters$/,
    (f, n) => `« ${f} » doit faire au moins ${n} caractères`,
  ],
  [/^\S+ must be a boolean value$/, (f) => `« ${f} » doit être vrai ou faux`],
  [/^\S+ must be an array$/, (f) => `« ${f} » doit être une liste`],
  [
    /^\S+ must contain no more than (\d+) elements$/,
    (f, n) => `« ${f} » doit contenir au plus ${n} éléments`,
  ],
  [
    /^\S+ must be a valid ISO 8601 date string$/,
    (f) => `« ${f} » doit être une date valide`,
  ],
  [/^\S+ must be a Date instance$/, (f) => `« ${f} » doit être une date`],
  [
    /^\S+ must be an email$/,
    (f) => `« ${f} » doit être une adresse e-mail valide`,
  ],
  [/^\S+ must be a URL address$/, (f) => `« ${f} » doit être une URL valide`],
  [
    /^\S+ must match .+ regular expression$/,
    (f) => `« ${f} » n'a pas le bon format`,
  ],
  [
    /^\S+ must be a (latitude|longitude) string or number$/,
    (f, kind) =>
      `« ${f} » doit être une ${kind === 'latitude' ? 'latitude' : 'longitude'} valide`,
  ],
  [
    /^property \S+ should not exist$/,
    (f) => `Le champ « ${f} » n'est pas accepté`,
  ],
  [
    /^nested property \S+ must be either object or array$/,
    (f) => `« ${f} » doit être un objet ou une liste`,
  ],
];

export function translateValidationMessage(
  field: string,
  message: string,
): string {
  for (const [pattern, translate] of TRANSLATIONS) {
    const match = pattern.exec(message);
    if (match) return translate(field, ...match.slice(1));
  }

  return message;
}

function collect(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) =>
      translateValidationMessage(field, message),
    );

    return [...own, ...collect(error.children ?? [], field)];
  });
}

/**
 * `exceptionFactory` du `ValidationPipe` global : meme reponse que Nest
 * (`{ message: string[], error, statusCode }`), messages en francais.
 */
export function frenchValidationException(errors: ValidationError[]) {
  return new BadRequestException(collect(errors));
}
