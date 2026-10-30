import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLiveDto } from './create-live.dto';
import { IsFacebookVideoLink } from './facebook-video-link.decorator';

export class UpdateLiveDto extends PartialType(CreateLiveDto) {
  /**
   * Correction du lien d'un live termine (replay). Avant, il se renseigne par
   * `POST /lives/:id/start` : le service refuse ce champ hors replay.
   */
  @IsOptional()
  @IsFacebookVideoLink()
  facebookUrl?: string;

  /** Faux : retire le replay de « Nos vidéos » sans supprimer le live. */
  @IsOptional()
  @IsBoolean()
  replayVisible?: boolean;
}
