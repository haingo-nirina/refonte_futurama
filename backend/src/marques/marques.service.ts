import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarqueDto } from './dto/create-marque.dto';
import { UpdateMarqueDto } from './dto/update-marque.dto';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Le nombre de produits rattaches accompagne chaque marque : c'est ce que le
 * backoffice affiche dans sa liste, et ce qu'il annonce avant une suppression.
 */
const PRODUCTS_COUNT = {
  _count: { select: { products: true } },
} as const;

@Injectable()
export class MarquesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMarqueDto) {
    return this.catchDuplicateSlug(() =>
      this.prisma.marque.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          logoUrl: dto.logoUrl ?? null,
        },
        include: PRODUCTS_COUNT,
      }),
    );
  }

  findAll() {
    return this.prisma.marque.findMany({
      orderBy: { name: 'asc' },
      include: PRODUCTS_COUNT,
    });
  }

  async findOne(id: string) {
    const marque = await this.prisma.marque.findUnique({
      where: { id },
      include: PRODUCTS_COUNT,
    });

    if (!marque) {
      throw new NotFoundException(`Marque ${id} introuvable`);
    }

    return marque;
  }

  async update(id: string, dto: UpdateMarqueDto) {
    await this.findOneOrFail(id);

    return this.catchDuplicateSlug(() =>
      this.prisma.marque.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          logoUrl: dto.logoUrl,
        },
        include: PRODUCTS_COUNT,
      }),
    );
  }

  /**
   * `Product.marqueId` est en `onDelete: SetNull` : supprimer une marque ne
   * supprime aucun produit, elle les detache. Rien a verifier ici donc, mais
   * le backoffice doit l'annoncer avant de confirmer.
   */
  async remove(id: string) {
    await this.findOneOrFail(id);

    return this.prisma.marque.delete({ where: { id } });
  }

  private async findOneOrFail(id: string) {
    const marque = await this.prisma.marque.findUnique({ where: { id } });

    if (!marque) {
      throw new NotFoundException(`Marque ${id} introuvable`);
    }

    return marque;
  }

  /** `Marque.slug` est unique : le P2002 devient une 409 lisible. */
  private async catchDuplicateSlug<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Ce slug est deja utilise par une marque');
      }

      throw error;
    }
  }
}
