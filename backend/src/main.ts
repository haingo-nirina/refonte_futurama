// Charge .env dans process.env avant l'evaluation d'AppModule : PrismaService
// lit DATABASE_URL des son constructeur. Nest ne charge aucun .env tout seul.
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { UPLOADS_PREFIX, UPLOADS_ROOT } from './uploads/uploads.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Les visuels televerses sont servis en statique sous `/uploads`. C'est
  // exactement le chemin stocke dans `ProductImage.imageUrl`, et le front le
  // remonte tel quel via un rewrite Next : rien a reecrire cote client.
  app.useStaticAssets(UPLOADS_ROOT, { prefix: UPLOADS_PREFIX });

  // Sans ce pipe global, les decorateurs class-validator des DTO sont inertes.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
