import { PartialType } from '@nestjs/mapped-types';
import { CreatePromotionDto } from './create-promotion.dto';

/**
 * Tous les champs deviennent optionnels, `productId` compris : deplacer une
 * promotion d'un produit a l'autre est un cas legitime, et le service revalide
 * alors le chevauchement sur le produit cible.
 */
export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
