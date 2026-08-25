// Charge .env dans process.env avant l'evaluation d'AppModule : PrismaService
// lit DATABASE_URL des son constructeur. Nest ne charge aucun .env tout seul.
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
