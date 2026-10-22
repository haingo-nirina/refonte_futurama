import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

const FOREIGN_KEY_VIOLATION = 'P2003';

/** Le backoffice affiche les retraits deja passes par la boutique. */
const ORDERS_COUNT = { _count: { select: { orders: true } } } as const;

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  /** Points de retrait proposes au panier. */
  findActive() {
    return this.prisma.store.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Backoffice : toutes les boutiques, desactivees comprises. */
  findAllForAdmin() {
    return this.prisma.store.findMany({
      orderBy: { createdAt: 'asc' },
      include: ORDERS_COUNT,
    });
  }

  create(dto: CreateStoreDto) {
    return this.prisma.store.create({
      data: {
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        openingHours: dto.openingHours,
        latitude: toDecimal(dto.latitude) ?? null,
        longitude: toDecimal(dto.longitude) ?? null,
        pickupDelayDays: dto.pickupDelayDays ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: ORDERS_COUNT,
    });
  }

  async update(id: string, dto: UpdateStoreDto) {
    await this.findOneOrFail(id);

    return this.prisma.store.update({
      where: { id },
      // `PartialType` laisse passer `null` : seules latitude et longitude
      // l'acceptent, les autres champs gardent alors leur valeur.
      data: {
        name: dto.name ?? undefined,
        address: dto.address ?? undefined,
        phone: dto.phone ?? undefined,
        openingHours: dto.openingHours ?? undefined,
        latitude: toDecimal(dto.latitude),
        longitude: toDecimal(dto.longitude),
        pickupDelayDays: dto.pickupDelayDays ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
      include: ORDERS_COUNT,
    });
  }

  /**
   * `Order.storeId` est en `onDelete: Restrict` : une commande en retrait
   * doit toujours savoir ou elle a ete retiree. Une boutique qui a deja servi
   * se desactive, elle ne se supprime pas.
   */
  async remove(id: string) {
    await this.findOneOrFail(id);

    try {
      return await this.prisma.store.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new ConflictException(
          'Des commandes sont rattachees a cette boutique : desactivez-la plutot',
        );
      }

      throw error;
    }
  }

  private async findOneOrFail(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });

    if (!store) {
      throw new NotFoundException(`Boutique ${id} introuvable`);
    }

    return store;
  }
}

/** `undefined` laisse la valeur en place, `null` l'efface. */
function toDecimal(value: number | null | undefined) {
  if (value === undefined || value === null) return value;

  return new Prisma.Decimal(value);
}
