import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { RELATION_TYPES, type RelationType } from '../../common/constants';

export class ProductRelationInputDto {
  @IsUUID()
  relatedProductId: string;

  @IsIn(RELATION_TYPES)
  relationType: RelationType;
}

export class ReplaceProductRelationsDto {
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ProductRelationInputDto)
  relations: ProductRelationInputDto[];
}
