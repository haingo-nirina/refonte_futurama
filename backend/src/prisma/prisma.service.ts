import { readFileSync } from 'node:fs';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { ConnectionOptions } from 'node:tls';

/**
 * Traduit le `sslmode` de DATABASE_URL en config TLS pour node-postgres.
 *
 * Aiven presente un certificat signe par sa propre CA. node-postgres traite
 * aujourd'hui `sslmode=require` comme `verify-full`, ce qui rejette cette
 * chaine self-signed ; on retablit la semantique libpq (chiffrer sans verifier
 * la chaine). Pour verifier la chaine (recommande en prod), pointer
 * DATABASE_CA_CERT sur le CA Aiven.
 *
 * `sslmode` doit etre retire de l'URL : pg la reparse et ecrase sinon l'objet
 * `ssl` qu'on passe explicitement.
 */
function buildConnectionConfig(rawUrl: string): {
  connectionString: string;
  ssl: ConnectionOptions | boolean;
} {
  const url = new URL(rawUrl);
  const sslmode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');

  const connectionString = url.toString();

  if (!sslmode || sslmode === 'disable') {
    return { connectionString, ssl: false };
  }

  const caPath = process.env.DATABASE_CA_CERT;

  if (caPath) {
    return {
      connectionString,
      ssl: { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true },
    };
  }

  const verifies = sslmode === 'verify-ca' || sslmode === 'verify-full';

  return { connectionString, ssl: { rejectUnauthorized: verifies } };
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const rawUrl = process.env.DATABASE_URL;

    if (!rawUrl) {
      throw new Error('DATABASE_URL est absent de l environnement');
    }

    // Prisma 7 exige un driver adapter pour se connecter a PostgreSQL.
    super({ adapter: new PrismaPg(buildConnectionConfig(rawUrl)) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
