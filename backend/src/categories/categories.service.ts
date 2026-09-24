import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BulkDeleteCategoriesDto } from './dto/bulk-delete-categories.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/** L'arbre est expose sur un seul niveau : parent direct + enfants directs. */
const CATEGORY_INCLUDE = {
  parent: { select: { id: true, name: true, slug: true } },
  children: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const parentId = dto.parentId ?? null;

    if (parentId) {
      await this.findOneOrFail(parentId);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId,
        imageUrl: dto.imageUrl ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isFeatured: dto.isFeatured ?? false,
      },
      include: CATEGORY_INCLUDE,
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: CATEGORY_INCLUDE,
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: CATEGORY_INCLUDE,
    });

    if (!category) {
      throw new NotFoundException(`Categorie ${id} introuvable`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOneOrFail(id);

    // `undefined` = champ non fourni (on ne touche pas), `null` = detacher du parent.
    const parentId =
      dto.parentId === undefined ? undefined : (dto.parentId ?? null);

    if (parentId) {
      if (parentId === id) {
        throw new BadRequestException(
          'Une categorie ne peut pas etre son propre parent',
        );
      }

      await this.findOneOrFail(parentId);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId,
        imageUrl: dto.imageUrl,
        displayOrder: dto.displayOrder,
        isFeatured: dto.isFeatured,
      },
      include: CATEGORY_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);

    // Product.categoryId est en onDelete: Restrict cote schema : on renvoie une
    // 400 explicite plutot que de laisser remonter l'erreur de contrainte.
    const products = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (products > 0) {
      throw new BadRequestException(
        `Categorie ${id} encore rattachee a ${products} produit(s)`,
      );
    }

    return this.prisma.category.delete({ where: { id } });
  }

  /**
   * Suppression groupee depuis le backoffice. Tout ou rien : si une seule
   * categorie porte encore des produits (`onDelete: Restrict`), aucune n'est
   * supprimee et la 400 les nomme toutes — une suppression partielle laisserait
   * l'admin deviner lesquelles sont restees.
   *
   * Les sous-rayons non coches sont detaches (`SetNull`), comme en unitaire.
   * Des identifiants inconnus sont ignores : `count` dit ce qui a reellement
   * ete supprime.
   */
  async removeMany(dto: BulkDeleteCategoriesDto) {
    const blocked = await this.prisma.category.findMany({
      where: { id: { in: dto.ids }, products: { some: {} } },
      select: { name: true, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });

    if (blocked.length > 0) {
      const list = blocked
        .map((category) => `${category.name} (${category._count.products})`)
        .join(', ');

      throw new BadRequestException(
        `Categories encore rattachees a des produits : ${list}. Deplacez ou supprimez ces produits d'abord.`,
      );
    }

    const { count } = await this.prisma.category.deleteMany({
      where: { id: { in: dto.ids } },
    });

    return { count };
  }

  private async findOneOrFail(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Categorie ${id} introuvable`);
    }

    return category;
  }
}
