import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { UploadsService } from './uploads.service';
import { MAX_UPLOAD_BYTES } from './uploads.constants';
import { UploadImageQueryDto } from './dto/upload-image-query.dto';

/**
 * Televersement des visuels du backoffice (produits, categories). Reserve aux
 * administrateurs : un depot de fichier ouvert est un service d'hebergement
 * gratuit pour n'importe qui.
 *
 * La route ne rattache le fichier a rien : elle stocke et renvoie une URL.
 * C'est ce qui permet de televerser avant meme que l'entite existe.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  @AdminOnly()
  // Stockage en memoire plutot que sur disque : le fichier n'est ecrit qu'une
  // fois son type valide, ce qui evite de nettoyer un rebut apres coup.
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  uploadImage(
    @Query() query: UploadImageQueryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier recu');
    }

    return this.uploadsService.saveImage(file, query.kind);
  }
}
