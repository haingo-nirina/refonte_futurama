import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { IsMediaRef } from '../../common/is-media-ref.decorator';

export class CreateMarqueDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "L'identifiant d'URL doit être en minuscules, mots séparés par des tirets",
  })
  slug: string;

  /**
   * Logo televerse (`/uploads/marques/...`) ou URL externe : `@IsUrl()`
   * refuserait le premier cas.
   */
  @IsOptional()
  @IsMediaRef()
  logoUrl?: string;
}
