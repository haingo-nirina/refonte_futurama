import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/**
 * Les categories cochees dans le backoffice. Pas de forme `all: true` comme
 * pour les produits : la liste n'est pas paginee, « tout selectionner »
 * envoie deja tous les identifiants.
 */
export class BulkDeleteCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids: string[];
}
