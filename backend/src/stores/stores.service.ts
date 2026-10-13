import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
