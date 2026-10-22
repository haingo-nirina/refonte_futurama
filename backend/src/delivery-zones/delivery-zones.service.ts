import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const ZONE_ORDER = [
  { displayOrder: 'asc' },
  { name: 'asc' },
] satisfies Prisma.DeliveryZoneOrderByWithRelationInput[];

/** Le backoffice affiche combien de commandes ont ete livrees dans la zone. */
const ORDERS_COUNT = { _count: { select: { orders: true } } } as const;

@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Zones proposees au panier : les zones desactivees n'y figurent pas. */
  findActive() {
    return this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: ZONE_ORDER,
    });
  }

  /** Backoffice : toutes les zones, desactivees comprises. */
  findAllForAdmin() {
    return this.prisma.deliveryZone.findMany({
      orderBy: ZONE_ORDER,
      include: ORDERS_COUNT,
    });
  }

  create(dto: CreateDeliveryZoneDto) {
    return this.catchDuplicateName(() =>
      this.prisma.deliveryZone.create({
        data: {
          name: dto.name ?? undefined,
          price: new Prisma.Decimal(dto.price),
          delayDays: dto.delayDays,
          freeThreshold: toDecimal(dto.freeThreshold) ?? null,
          isActive: dto.isActive ?? true,
          displayOrder: dto.displayOrder ?? 0,
        },
        include: ORDERS_COUNT,
      }),
    );
  }

  /**
   * Les commandes passees ont copie le nom, le delai et les frais : modifier
   * une zone ne change que les commandes a venir.
   */
  async update(id: string, dto: UpdateDeliveryZoneDto) {
    await this.findOneOrFail(id);

    return this.catchDuplicateName(() =>
      this.prisma.deliveryZone.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          // `PartialType` laisse passer `null` : une zone garde toujours un prix
          price: toDecimal(dto.price) ?? undefined,
          delayDays: dto.delayDays ?? undefined,
          freeThreshold: toDecimal(dto.freeThreshold),
          isActive: dto.isActive ?? undefined,
          displayOrder: dto.displayOrder ?? undefined,
        },
        include: ORDERS_COUNT,
      }),
    );
  }

  /**
   * `Order.deliveryZoneId` est en `onDelete: SetNull` et la commande garde sa
   * copie du nom de zone : la suppression ne perd rien de l'historique.
   */
  async remove(id: string) {
    await this.findOneOrFail(id);

    return this.prisma.deliveryZone.delete({ where: { id } });
  }

  private async findOneOrFail(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });

    if (!zone) {
      throw new NotFoundException(`Zone de livraison ${id} introuvable`);
    }

    return zone;
  }

  /** `DeliveryZone.name` est unique : le P2002 devient une 409 lisible. */
  private async catchDuplicateName<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Une zone porte deja ce nom');
      }

      throw error;
    }
  }
}

/** `undefined` laisse la valeur en place, `null` l'efface. */
function toDecimal(value: number | null | undefined) {
  if (value === undefined || value === null) return value;

  return new Prisma.Decimal(value);
}
