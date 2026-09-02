import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Verifie qu'une date est strictement posterieure a une autre propriete du
 * meme DTO (typiquement `endDate` apres `startDate`).
 *
 * Le controle est *ignore* si l'autre propriete est absente : sur un `PATCH`
 * partiel le DTO ne porte qu'un des deux bords, et l'autre vient de la ligne
 * existante. C'est donc au service de refaire le controle sur les valeurs
 * fusionnees — celui-ci n'est qu'un filet a l'entree.
 */
export const IsAfter = (property: string, options?: ValidationOptions) =>
  function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfter',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [otherName] = args.constraints as [string];
          const other = (args.object as Record<string, unknown>)[otherName];

          if (other === undefined || other === null) return true;
          if (!(value instanceof Date) || !(other instanceof Date)) return true;

          return value.getTime() > other.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          const [otherName] = args.constraints as [string];
          return `$property doit etre strictement posterieure a ${otherName}`;
        },
      },
    });
  };
