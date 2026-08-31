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
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from './uploads.constants';
import { UploadImageQueryDto } from './dto/upload-image-query.dto';

/**
 * Televersement des visuels du backoffice (produits, categories). Reserve aux
 * administrateurs : un depot de fichier ouvert est un service d'hebergement
 * gratuit pour n'importe qui.
 *
 * Les routes ne rattachent le fichier a rien : elles stockent et renvoient une
 * URL. C'est ce qui permet de televerser avant meme que l'entite existe.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  @AdminOnly()
  // Stockage en memoire plutot que sur disque : le fichier n'est ecrit qu'une
  // fois son type valide, ce qui evite de nettoyer un rebut apres coup.
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }),
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

  /**
   * Video de demonstration d'un produit. Pas de `kind` ici : une video n'a
   * qu'un seul point d'attache, `Product.videoUrl`.
   */
  @Post('videos')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_VIDEO_BYTES } }),
  )
  uploadVideo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier recu');
    }

    return this.uploadsService.saveVideo(file);
  }
}
