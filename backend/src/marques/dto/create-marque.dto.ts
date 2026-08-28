import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { IsImageRef } from '../../common/is-image-ref.decorator';

export class CreateMarqueDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug doit etre en minuscules, mots separes par des tirets',
  })
  slug: string;

  /**
   * Logo televerse (`/uploads/marques/...`) ou URL externe : `@IsUrl()`
   * refuserait le premier cas.
   */
  @IsOptional()
  @IsImageRef()
  logoUrl?: string;
}
