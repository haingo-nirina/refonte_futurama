import { IsIn, IsOptional } from 'class-validator';
import { UPLOAD_KINDS, type UploadKind } from '../uploads.constants';

export class UploadImageQueryDto {
  /** Sous-dossier de destination. Par defaut, les visuels produit. */
  @IsOptional()
  @IsIn(UPLOAD_KINDS)
  kind?: UploadKind;
}
