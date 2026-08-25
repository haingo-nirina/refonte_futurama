import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { UpdateResellerDto } from './dto/update-reseller.dto';

@Injectable()
export class ResellersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateResellerDto) {
    return this.prisma.reseller.create({ data: dto });
  }

  findAll() {
    return this.prisma.reseller.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async update(id: string, dto: UpdateResellerDto) {
    await this.findOneOrFail(id);

    return this.prisma.reseller.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);

    return this.prisma.reseller.delete({ where: { id } });
  }

  private async findOneOrFail(id: string) {
    const reseller = await this.prisma.reseller.findUnique({ where: { id } });

    if (!reseller) {
      throw new NotFoundException(`Revendeur ${id} introuvable`);
    }

    return reseller;
  }
}
