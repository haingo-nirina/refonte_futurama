import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  IMAGE_EXTENSIONS,
  UPLOAD_KIND,
  UPLOADS_PREFIX,
  UPLOADS_ROOT,
  type UploadKind,
} from './uploads.constants';

@Injectable()
export class UploadsService {
  /**
   * Ecrit le fichier et renvoie l'URL a stocker telle quelle (dans
   * `ProductImage.imageUrl`, `Category.imageUrl`...).
   *
   * Le nom d'origine n'est jamais reutilise : il vient du client, et un
   * `../` dedans ecrirait n'importe ou sur le disque. On genere un UUID et on
   * deduit l'extension du type MIME, seul champ qu'on a valide. `kind` est
   * contraint par le DTO a la liste blanche des sous-dossiers.
   */
  async saveImage(
    file: Express.Multer.File,
    kind: UploadKind = UPLOAD_KIND.PRODUCTS,
  ) {
    const extension = IMAGE_EXTENSIONS[file.mimetype];

    if (!extension) {
      throw new BadRequestException(
        `Format non supporte (${file.mimetype}). Attendu : JPEG, PNG, WebP ou AVIF.`,
      );
    }

    const directory = join(UPLOADS_ROOT, kind);
    await mkdir(directory, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(directory, filename), file.buffer);

    return {
      url: `${UPLOADS_PREFIX}/${kind}/${filename}`,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
