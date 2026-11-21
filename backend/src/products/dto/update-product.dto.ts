import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// Les images d'un produit existant passent par `PUT /products/:id/images`.
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['images'] as const),
) {}
