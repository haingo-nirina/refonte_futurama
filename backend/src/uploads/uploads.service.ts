import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  IMAGE_EXTENSIONS,
  UPLOAD_KIND,
  UPLOADS_PREFIX,
  UPLOADS_ROOT,
  VIDEO_EXTENSIONS,
  VIDEOS_DIRECTORY,
  type UploadKind,
} from './uploads.constants';

@Injectable()
export class UploadsService {
  /**
   * Ecrit le fichier et renvoie l'URL a stocker telle quelle (dans
   * `ProductImage.imageUrl`, `Category.imageUrl`...).
   *
   * `kind` est contraint par le DTO a la liste blanche des sous-dossiers.
   */
  saveImage(
    file: Express.Multer.File,
    kind: UploadKind = UPLOAD_KIND.PRODUCTS,
  ) {
    return this.save(file, kind, IMAGE_EXTENSIONS, 'JPEG, PNG, WebP ou AVIF');
  }

  /**
   * Meme depot que les photos, dans `uploads/videos`. L'URL renvoyee va dans
   * `Product.videoUrl`, qui accepte aussi bien ce chemin qu'une video hebergee
   * ailleurs (`@IsMediaRef`).
   */
  saveVideo(file: Express.Multer.File) {
    return this.save(
      file,
      VIDEOS_DIRECTORY,
      VIDEO_EXTENSIONS,
      'MP4, WebM ou MOV',
    );
  }

  /**
   * Le nom d'origine n'est jamais reutilise : il vient du client, et un `../`
   * dedans ecrirait n'importe ou sur le disque. On genere un UUID et on deduit
   * l'extension du type MIME, seul champ qu'on a valide.
   */
  private async save(
    file: Express.Multer.File,
    directory: string,
    extensions: Record<string, string>,
    expected: string,
  ) {
    const extension = extensions[file.mimetype];

    if (!extension) {
      throw new BadRequestException(
        `Format non supporte (${file.mimetype}). Attendu : ${expected}.`,
      );
    }

    const target = join(UPLOADS_ROOT, directory);
    await mkdir(target, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(target, filename), file.buffer);

    return {
      url: `${UPLOADS_PREFIX}/${directory}/${filename}`,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
