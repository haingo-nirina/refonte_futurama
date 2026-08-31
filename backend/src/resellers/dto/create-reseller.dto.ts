import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { IsMediaRef } from '../../common/is-media-ref.decorator';
import { Type } from 'class-transformer';

export class CreateResellerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  hours?: string;

  @IsOptional()
  @IsMediaRef()
  logoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
