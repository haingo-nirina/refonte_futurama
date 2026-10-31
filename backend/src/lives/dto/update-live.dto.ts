import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLiveDto } from './create-live.dto';

export class UpdateLiveDto extends PartialType(CreateLiveDto) {
  /** Faux : retire le replay de « Nos vidéos » sans supprimer le live. */
  @IsOptional()
  @IsBoolean()
  replayVisible?: boolean;
}
