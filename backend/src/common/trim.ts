/**
 * A poser avec `@Transform(trim)` devant `@IsNotEmpty()` : le validateur ne
 * trimme pas, une suite d'espaces passerait donc pour un texte renseigne et se
 * stockerait en contenu vide a l'affichage.
 */
export const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
