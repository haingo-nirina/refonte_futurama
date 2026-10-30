import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LIVE_STATUS, ORDER_STATUS } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  activePromotionInclude,
  withActivePromotion,
} from '../promotions/promotion-pricing';
import { CreateLiveDto } from './dto/create-live.dto';
import { PaginateReplaysDto } from './dto/paginate-replays.dto';
import { StartLiveDto } from './dto/start-live.dto';
import { UpdateLiveDto } from './dto/update-live.dto';

const FOREIGN_KEY_VIOLATION = 'P2003';

const HOUR_MS = 3_600_000;

/**
 * Un live programme dont la date est passee depuis plus longtemps que ca
 * n'est plus annonce : la vendeuse l'a sans doute oublie, et la page /live
 * retombe alors sur le dernier replay.
 */
const STALE_SCHEDULED_HOURS = 24;

/**
 * Un direct detecte sur Facebook reprend le live programme le plus proche,
 * jusqu'a cette avance : lancer le direct un peu tot ne doit pas creer un
 * second live, mais un direct improvise ne doit pas non plus voler les
 * produits d'un live prevu la semaine suivante.
 */
const EARLY_START_HOURS = 12;

/** Titre d'un live cree depuis Facebook, quand la video n'en a pas. */
const DEFAULT_LIVE_TITLE = 'Live Facebook';

/** Images triees : la principale d'abord, puis l'ordre d'affichage. */
const IMAGES_INCLUDE = {
  orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
} as const satisfies Prisma.Product$imagesArgs;

/**
 * Produits de la page publique : un produit desactive disparait du live comme
 * du catalogue, et chacun porte sa promotion active pour annoncer le meme prix
 * que le panier.
 */
function publicProductsArgs(now: Date) {
  return {
    where: { product: { isActive: true } },
    orderBy: { displayOrder: 'asc' },
    include: {
      product: {
        include: {
          images: IMAGES_INCLUDE,
          promotions: activePromotionInclude(now),
        },
      },
    },
  } satisfies Prisma.Live$productsArgs;
}

/** Formulaire du backoffice : la selection telle quelle, desactives compris. */
const ADMIN_LIVE_INCLUDE = {
  products: {
    orderBy: { displayOrder: 'asc' },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          reference: true,
          price: true,
          stock: true,
          isActive: true,
          images: { ...IMAGES_INCLUDE, take: 1 },
        },
      },
    },
  },
} as const satisfies Prisma.LiveInclude;

/**
 * Duree de vie du live « en direct » garde en memoire pour `GET /live/current`,
 * que chaque visiteur relit toutes les 30 s : sans ce cache, chaque relecture
 * couterait un aller-retour vers Aiven. Toute ecriture le vide, ce delai ne
 * couvre que ce qui changerait la base sans passer par ce service.
 */
const ON_AIR_TTL_MS = 15_000;

/** Ce que lisent le bandeau du header et la page /live pour savoir s'il y a un direct. */
export type OnAirLive = {
  id: string;
  title: string;
  url: string;
  startedAt: Date | null;
};

/**
 * Un replay est un live termine qui a une video : la video reste sur Facebook,
 * le lien enregistre au lancement suffit a la relire. Rien d'autre a archiver.
 */
const REPLAY_WHERE = {
  status: LIVE_STATUS.TERMINE,
  facebookUrl: { not: null },
  replayVisible: true,
} satisfies Prisma.LiveWhereInput;

/** Ce que la detection Facebook transmet : de quoi reconnaitre et nommer le direct. */
export type DetectedFacebookLive = { url: string; title: string };

@Injectable()
export class LivesService {
  private onAir: Promise<OnAirLive | null> | null = null;
  private onAirReadAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Le live en direct, sans ses produits : de quoi afficher le bandeau et
   * savoir si la page /live est a jour. Lu en base, donc identique que le
   * direct ait ete lance a la main ou detecte sur Facebook.
   */
  findOnAir(): Promise<OnAirLive | null> {
    if (this.onAir && Date.now() - this.onAirReadAt < ON_AIR_TTL_MS) {
      return this.onAir;
    }

    this.onAirReadAt = Date.now();
    const read = this.prisma.live
      .findFirst({
        where: { status: LIVE_STATUS.EN_DIRECT, facebookUrl: { not: null } },
        orderBy: { startedAt: 'desc' },
        select: { id: true, title: true, facebookUrl: true, startedAt: true },
      })
      .then((live) =>
        live
          ? {
              id: live.id,
              title: live.title,
              url: live.facebookUrl!,
              startedAt: live.startedAt,
            }
          : null,
      );
    // une lecture ratee ne doit pas rester en cache 15 s
    read.catch(() => {
      if (this.onAir === read) this.onAir = null;
    });
    this.onAir = read;

    return read;
  }

  /**
   * Le live affiche par /live : celui en direct, sinon le prochain programme,
   * sinon le dernier termine (replay). `null` s'il n'y en a aucun.
   *
   * Les trois candidats sont lus en parallele : en sequence, chaque essai
   * rate couterait un aller-retour complet vers Aiven.
   */
  async findCurrent() {
    const now = new Date();
    const include = { products: publicProductsArgs(now) };
    const staleBefore = new Date(
      now.getTime() - STALE_SCHEDULED_HOURS * HOUR_MS,
    );

    const [live, scheduled, ended] = await Promise.all([
      this.prisma.live.findFirst({
        where: { status: LIVE_STATUS.EN_DIRECT },
        orderBy: { startedAt: 'desc' },
        include,
      }),
      this.prisma.live.findFirst({
        where: {
          status: LIVE_STATUS.PROGRAMME,
          scheduledAt: { gte: staleBefore },
        },
        orderBy: { scheduledAt: 'asc' },
        include,
      }),
      // un replay retire de « Nos vidéos » ne revient pas par /live
      this.prisma.live.findFirst({
        where: { status: LIVE_STATUS.TERMINE, replayVisible: true },
        orderBy: { endedAt: 'desc' },
        include,
      }),
    ]);

    const current = live ?? scheduled ?? ended;
    if (!current) return null;

    const { products, ...rest } = current;
    return {
      ...rest,
      products: products.map(({ product }) => withActivePromotion(product)),
    };
  }

  /**
   * Section « Nos vidéos » : les replays, le plus recent d'abord. Sans les
   * produits, que seule la page du replay affiche.
   */
  async findReplays(query: PaginateReplaysDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 9;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.live.findMany({
        where: REPLAY_WHERE,
        orderBy: { endedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          facebookUrl: true,
          startedAt: true,
          endedAt: true,
          // ceux que la page du replay affichera : les desactives n'y sont pas
          _count: {
            select: { products: { where: { product: { isActive: true } } } },
          },
        },
      }),
      this.prisma.live.count({ where: REPLAY_WHERE }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Un replay et ses produits, sous la meme forme que `findCurrent` : la page
   * du replay reutilise la salle du live. 404 sur un live qui n'est pas (ou
   * pas encore) un replay.
   */
  async findReplay(id: string) {
    const live = await this.prisma.live.findFirst({
      where: { id, ...REPLAY_WHERE },
      include: { products: publicProductsArgs(new Date()) },
    });

    if (!live) {
      throw new NotFoundException(`Vidéo ${id} introuvable`);
    }

    const { products, ...rest } = live;
    return {
      ...rest,
      products: products.map(({ product }) => withActivePromotion(product)),
    };
  }

  /**
   * Backoffice : tous les lives, avec leurs ventes. Les commandes annulees ne
   * comptent pas comme des ventes.
   */
  async findAllForAdmin() {
    const [lives, sales] = await Promise.all([
      this.prisma.live.findMany({
        orderBy: { scheduledAt: 'desc' },
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.order.groupBy({
        by: ['liveId'],
        where: {
          liveId: { not: null },
          status: { not: ORDER_STATUS.ANNULEE },
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    const salesByLive = new Map(sales.map((row) => [row.liveId, row]));

    return lives.map((live) => {
      const row = salesByLive.get(live.id);

      return {
        ...live,
        sales: {
          orders: row?._count._all ?? 0,
          revenue: row?._sum.total ?? new Prisma.Decimal(0),
        },
      };
    });
  }

  findOneForAdmin(id: string) {
    return this.findOneOrFail(id, ADMIN_LIVE_INCLUDE);
  }

  /**
   * Le lien Facebook n'est pas saisi ici : il n'existe qu'une fois le direct
   * lance, il arrive par `start()` (ou par la detection automatique).
   */
  async create(dto: CreateLiveDto) {
    const productIds = dto.productIds ?? [];
    await this.assertProductsExist(productIds);

    return this.prisma.live.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        scheduledAt: new Date(dto.scheduledAt),
        products: { create: toLiveProducts(productIds) },
      },
      include: ADMIN_LIVE_INCLUDE,
    });
  }

  /**
   * Modifiable a tout moment, en direct compris : corriger un titre ou ajouter
   * un produit pendant la diffusion doit rester possible.
   */
  async update(id: string, dto: UpdateLiveDto) {
    const live = await this.findOneOrFail(id);

    // Avant la fin, le lien passe par `start()` : il y fait passer le live en
    // direct, ce qu'une simple modification ne doit pas contourner.
    if (dto.facebookUrl && live.status !== LIVE_STATUS.TERMINE) {
      throw new BadRequestException(
        'Le lien se renseigne en lançant le live ; il ne se corrige ici qu’une fois le live terminé',
      );
    }

    if (dto.productIds) {
      await this.assertProductsExist(dto.productIds);
    }

    const updated = await this.prisma.live.update({
      where: { id },
      // `PartialType` laisse passer `null` : seule la description l'accepte,
      // les autres champs gardent alors leur valeur.
      data: {
        title: dto.title ?? undefined,
        description:
          dto.description === undefined ? undefined : dto.description || null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        facebookUrl: dto.facebookUrl ?? undefined,
        replayVisible: dto.replayVisible ?? undefined,
        // remplacement en bloc, dans la meme ecriture : rien ne reference ces
        // lignes, les recreer est sans consequence
        products: dto.productIds
          ? { deleteMany: {}, create: toLiveProducts(dto.productIds) }
          : undefined,
      },
      include: ADMIN_LIVE_INCLUDE,
    });
    // le titre affiche par le bandeau a pu changer
    this.invalidateOnAir();

    return updated;
  }

  /**
   * `Order.liveId` est en `onDelete: Restrict` : supprimer un live qui a vendu
   * effacerait la mesure de ses ventes.
   */
  async remove(id: string) {
    await this.findOneOrFail(id);

    try {
      const removed = await this.prisma.live.delete({ where: { id } });
      this.invalidateOnAir();
      return removed;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new ConflictException(
          'Des commandes ont été passées depuis ce live : il ne peut pas être supprimé',
        );
      }

      throw error;
    }
  }

  /**
   * PROGRAMME -> EN_DIRECT, a la main : la vendeuse lance le direct sur la
   * Page, copie son lien et le colle ici. Sur un live deja en direct, ne fait
   * que remplacer le lien (lien errone colle au premier essai).
   *
   * Un seul live en direct a la fois : un autre live encore en direct passe
   * en replay dans la meme transaction. La mise a jour est conditionnee a
   * l'ancien statut, comme pour les commandes : un « Terminer » simultane
   * n'est pas ecrase.
   */
  async start(id: string, dto: StartLiveDto) {
    const live = await this.findOneOrFail(id);

    if (live.status === LIVE_STATUS.TERMINE) {
      throw new BadRequestException(
        'Ce live est terminé : programmez-en un nouveau',
      );
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.live.updateMany({
        where: { id, status: live.status },
        data: {
          status: LIVE_STATUS.EN_DIRECT,
          facebookUrl: dto.facebookUrl,
          startedAt: live.startedAt ?? now,
        },
      });

      if (count === 0) {
        throw new ConflictException(
          'Le statut du live a changé entre-temps : rechargez la page',
        );
      }

      await tx.live.updateMany({
        where: { status: LIVE_STATUS.EN_DIRECT, id: { not: id } },
        data: {
          status: LIVE_STATUS.TERMINE,
          endedAt: now,
          replayVisible: true,
        },
      });
    });
    this.invalidateOnAir();

    return this.findOneForAdmin(id);
  }

  /**
   * EN_DIRECT -> TERMINE, a la main : la vendeuse clique « Terminer » a la fin
   * du direct. Si la detection Facebook est active, elle le fait d'elle-meme.
   */
  async end(id: string) {
    const live = await this.findOneOrFail(id);

    if (live.status !== LIVE_STATUS.EN_DIRECT) {
      throw new BadRequestException("Ce live n'est pas en direct");
    }

    if (!(await this.markEnded(id))) {
      throw new ConflictException(
        'Le statut du live a changé entre-temps : rechargez la page',
      );
    }

    return this.findOneForAdmin(id);
  }

  /**
   * Aligne les statuts sur ce que la detection Facebook vient d'observer.
   * Appelee seulement quand le direct detecte change (debut, fin, autre
   * video), jamais a chaque relecture.
   *
   * - Plus de direct : le live en direct passe en replay.
   * - Un direct deja connu (meme lien) : rien a faire — y compris s'il a ete
   *   termine a la main, ce choix de la vendeuse l'emporte.
   * - Un nouveau direct : le live programme le plus proche le prend, avec ses
   *   produits ; a defaut, un live est cree pour que le replay et la mesure
   *   des ventes existent quand meme.
   *
   * Les mises a jour sont conditionnees a l'ancien statut, comme pour les
   * commandes : un « Terminer » simultane ne serait pas ecrase.
   */
  async syncWithFacebook(detected: DetectedFacebookLive | null): Promise<void> {
    try {
      await this.applyFacebookLive(detected);
    } finally {
      this.invalidateOnAir();
    }
  }

  private async applyFacebookLive(
    detected: DetectedFacebookLive | null,
  ): Promise<void> {
    const live = await this.prisma.live.findFirst({
      where: { status: LIVE_STATUS.EN_DIRECT },
      select: { id: true, facebookUrl: true },
    });

    if (!detected) {
      if (live) await this.markEnded(live.id);
      return;
    }

    if (live?.facebookUrl === detected.url) return;

    const known = await this.prisma.live.findFirst({
      where: { facebookUrl: detected.url },
      select: { id: true },
    });
    if (known) return;

    // Un seul live en direct a la fois : la page /live n'en affiche qu'un.
    if (live) await this.markEnded(live.id);

    const now = new Date();
    const scheduled = await this.prisma.live.findFirst({
      where: {
        status: LIVE_STATUS.PROGRAMME,
        scheduledAt: {
          gte: new Date(now.getTime() - STALE_SCHEDULED_HOURS * HOUR_MS),
          lte: new Date(now.getTime() + EARLY_START_HOURS * HOUR_MS),
        },
      },
      orderBy: { scheduledAt: 'asc' },
      select: { id: true },
    });

    if (scheduled) {
      await this.prisma.live.updateMany({
        where: { id: scheduled.id, status: LIVE_STATUS.PROGRAMME },
        data: {
          status: LIVE_STATUS.EN_DIRECT,
          startedAt: now,
          facebookUrl: detected.url,
        },
      });
      return;
    }

    await this.prisma.live.create({
      data: {
        title: detected.title || DEFAULT_LIVE_TITLE,
        scheduledAt: now,
        startedAt: now,
        status: LIVE_STATUS.EN_DIRECT,
        facebookUrl: detected.url,
      },
    });
  }

  /** Le lien reste : il sert de replay. `false` si le live n'etait plus en direct. */
  private async markEnded(id: string): Promise<boolean> {
    const { count } = await this.prisma.live.updateMany({
      where: { id, status: LIVE_STATUS.EN_DIRECT },
      // un live qui se termine entre dans les replays
      data: {
        status: LIVE_STATUS.TERMINE,
        endedAt: new Date(),
        replayVisible: true,
      },
    });
    this.invalidateOnAir();

    return count > 0;
  }

  private invalidateOnAir() {
    this.onAir = null;
  }

  private async findOneOrFail<I extends Prisma.LiveInclude>(
    id: string,
    include?: I,
  ) {
    const live = await this.prisma.live.findUnique({
      where: { id },
      include,
    });

    if (!live) {
      throw new NotFoundException(`Live ${id} introuvable`);
    }

    return live;
  }

  /** Un identifiant invente ferait echouer l'ecriture en 500 sur la cle etrangere. */
  private async assertProductsExist(productIds: string[]) {
    if (productIds.length === 0) return;

    const found = await this.prisma.product.count({
      where: { id: { in: productIds } },
    });

    if (found !== productIds.length) {
      throw new BadRequestException(
        'Un des produits sélectionnés est introuvable',
      );
    }
  }
}

function toLiveProducts(productIds: string[]) {
  return productIds.map((productId, index) => ({
    productId,
    displayOrder: index,
  }));
}
