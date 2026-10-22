import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trim } from '../../common/trim';

export class CreateStoreDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  /** Multi-lignes, affiche tel quel au panier */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  openingHours: string;

  /** `null` retire le point : la carte cherche alors l'adresse. */
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number | null;

  /** Jours ouvres avant que la commande soit prete : 0 = « En stock » */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  pickupDelayDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
