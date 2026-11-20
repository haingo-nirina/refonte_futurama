import { randomUUID } from 'crypto';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  PAYMENT_MODE,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TRANSACTION_STATUS,
} from '../common/constants';
import { paymentData } from '../orders/order-payment';
import { PrismaService } from '../prisma/prisma.service';
import { readManualPaymentPhone } from './manual-payment';
import {
  PAYMENT_PROVIDER,
  type PaymentOutcome,
  type PaymentProvider,
} from './payment-provider';

/**
 * Simulateur seulement : au-dela, une demande restee sans reponse (simulation
 * interrompue par un redemarrage du serveur) est consideree perdue et ne
 * bloque plus une nouvelle tentative. Un vrai fournisseur, lui, tranche
 * toujours — on attend son verdict, sinon un paiement valide tard serait
 * encaisse sans que la commande passe PAYEE.
 */
export const PENDING_PAYMENT_TTL_MS = 3 * 60 * 1000;

/** Delai avant la fausse confirmation du simulateur. */
const MOCK_CONFIRMATION_DELAY_MS = 5_000;

/** Relecture des demandes en cours chez le fournisseur. */
const STATUS_POLL_INTERVAL_MS = 5_000;
/** Une demande que le fournisseur n'a toujours pas tranchee est abandonnee. */
const STATUS_POLL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const PAYMENT_SELECT = {
  id: true,
  orderId: true,
  status: true,
  failureReason: true,
  amount: true,
  phone: true,
  requestedAt: true,
} as const;

@Injectable()
export class PaymentsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentsService.name);

  /**
   * Demandes en cours a relire chez le fournisseur (providerRef -> date de la
   * demande). En memoire pour ne pas interroger la base toutes les 5 s quand
   * personne ne paie ; rechargee au demarrage.
   */
  private readonly watched = new Map<string, number>();
  private polling = false;

  constructor(
    private readonly prisma: PrismaService,
    /** `null` en mode manuel : aucun paiement en ligne. */
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider | null,
  ) {}

  /**
   * Ce que l'ecran de paiement doit afficher : la demande MVola sur le
   * telephone, ou, en mode manuel, le numero ou envoyer l'argent.
   */
  getConfig() {
    return this.provider
      ? { mode: PAYMENT_MODE.MVOLA, merchantPhone: null }
      : { mode: PAYMENT_MODE.MANUEL, merchantPhone: readManualPaymentPhone() };
  }

  /**
   * Envoie la demande de paiement au telephone du client. Le montant et le
   * numero sont relus sur la commande : la requete ne porte que son id.
   *
   * Une seule demande en cours par commande, sinon le client pourrait payer
   * deux fois : la ligne de la commande est verrouillee le temps de verifier,
   * ce qui serialise deux clics simultanes.
   */
  async start(orderId: string, userId: string) {
    const provider = this.provider;
    if (!provider) {
      throw new BadRequestException(
        "Le paiement en ligne n'est pas encore disponible : envoyez le montant par MVola au numéro de la boutique",
      );
    }

    const { payment, order } = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;

      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          userId: true,
          number: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          mvolaPhone: true,
          total: true,
        },
      });

      if (!order) {
        throw new NotFoundException(`Commande ${orderId} introuvable`);
      }
      if (order.userId !== userId) {
        throw new ForbiddenException(
          'Cette commande appartient à un autre compte',
        );
      }
      if (order.paymentMethod !== PAYMENT_METHOD.MVOLA || !order.mvolaPhone) {
        throw new BadRequestException(
          'Cette commande ne se paie pas par MVola',
        );
      }
      if (
        order.status !== ORDER_STATUS.EN_ATTENTE_PAIEMENT ||
        order.paymentStatus === PAYMENT_STATUS.PAYE
      ) {
        throw new ConflictException("Cette commande n'attend plus de paiement");
      }

      if (!provider.checkStatus) {
        await this.expireStale(tx, { orderId });
      }

      const pending = await tx.payment.count({
        where: { orderId, status: PAYMENT_TRANSACTION_STATUS.EN_ATTENTE },
      });
      if (pending > 0) {
        throw new ConflictException(
          'Un paiement est déjà en cours : validez-le sur votre téléphone',
        );
      }

      // providerRef provisoire (notre reference) : remplace par celle du
      // fournisseur des sa reponse.
      const reference = randomUUID();
      const payment = await tx.payment.create({
        data: {
          orderId,
          provider: provider.name,
          providerRef: reference,
          amount: order.total,
          phone: order.mvolaPhone,
        },
        select: { ...PAYMENT_SELECT, providerRef: true },
      });

      return { payment, order };
    });

    // Appel reseau hors transaction : ne pas tenir le verrou pendant ce temps.
    let result: Awaited<ReturnType<PaymentProvider['request']>>;
    try {
      result = await provider.request({
        reference: payment.providerRef,
        amount: payment.amount,
        phone: payment.phone,
        description: `Commande ${order.number}`,
      });
    } catch (error) {
      this.logger.error(
        `Demande de paiement refusee pour ${order.number} : ${String(error)}`,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PAYMENT_TRANSACTION_STATUS.ECHOUE,
          failureReason: 'Demande refusée par le fournisseur',
          completedAt: new Date(),
        },
      });
      throw new BadGatewayException(
        'MVola est injoignable pour le moment, réessayez dans un instant',
      );
    }

    const saved = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: result.providerRef },
      select: PAYMENT_SELECT,
    });

    if (result.simulatedOutcome) {
      this.simulateCallback(result.providerRef, result.simulatedOutcome);
    } else if (provider.checkStatus) {
      this.watched.set(result.providerRef, Date.now());
    }

    return saved;
  }

  /**
   * Suivi d'une tentative, relu par l'ecran d'attente du client. Le statut
   * vient de la base, que tient a jour `pollWatched` (ou le simulateur). Une
   * simulation perdue est cloturee ici, pour que l'ecran propose de reessayer
   * au lieu d'attendre indefiniment.
   */
  async findOne(id: string, userId: string) {
    // le paiement d'un autre compte est traite comme introuvable : rien a
    // gagner a dire qu'il existe
    const payment = await this.prisma.payment.findFirst({
      where: { id, order: { userId } },
      select: PAYMENT_SELECT,
    });
    if (!payment) {
      throw new NotFoundException(`Paiement ${id} introuvable`);
    }

    const expired =
      !this.provider?.checkStatus &&
      payment.status === PAYMENT_TRANSACTION_STATUS.EN_ATTENTE &&
      payment.requestedAt.getTime() < Date.now() - PENDING_PAYMENT_TTL_MS;
    if (!expired) return payment;

    await this.expireStale(this.prisma, { id });

    return this.prisma.payment.findUniqueOrThrow({
      where: { id },
      select: PAYMENT_SELECT,
    });
  }

  /**
   * Callback MVola (`PUT /payments/mvola/callback`). Il n'est pas signe :
   * n'importe qui peut appeler cette route. On n'en lit donc que la reference,
   * et l'issue est relue chez MVola avant toute ecriture — un faux « completed »
   * ne paie rien.
   */
  async handleCallback(body: Record<string, unknown>) {
    const ref = body?.serverCorrelationId;
    if (typeof ref !== 'string' || !ref) {
      throw new BadRequestException('serverCorrelationId manquant');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: ref },
      select: { status: true, provider: true, requestedAt: true },
    });
    if (!payment || payment.provider !== this.provider?.name) {
      throw new NotFoundException(`Paiement ${ref} inconnu`);
    }

    if (payment.status === PAYMENT_TRANSACTION_STATUS.EN_ATTENTE) {
      // MVola injoignable a l'instant : `pollWatched` reprendra la main
      this.watched.set(ref, payment.requestedAt.getTime());
      await this.verify(ref).catch(() => undefined);
    }

    return { received: true };
  }

  /** Reprend au demarrage les demandes restees en cours. */
  async onApplicationBootstrap() {
    if (!this.provider?.checkStatus) return;

    const pending = await this.prisma.payment.findMany({
      where: {
        provider: this.provider.name,
        status: PAYMENT_TRANSACTION_STATUS.EN_ATTENTE,
        requestedAt: { gt: new Date(Date.now() - STATUS_POLL_MAX_AGE_MS) },
      },
      select: { providerRef: true, requestedAt: true },
    });
    for (const payment of pending) {
      this.watched.set(payment.providerRef, payment.requestedAt.getTime());
    }
  }

  /**
   * Relit chez le fournisseur chaque demande en cours. C'est ce qui confirme
   * le paiement sans callback — en local, MVola ne peut pas joindre le
   * serveur. Un tour encore en cours n'est pas double.
   */
  @Interval(STATUS_POLL_INTERVAL_MS)
  async pollWatched() {
    if (this.polling || this.watched.size === 0) return;
    this.polling = true;

    try {
      for (const [ref, requestedAt] of this.watched) {
        if (Date.now() - requestedAt > STATUS_POLL_MAX_AGE_MS) {
          this.watched.delete(ref);
          this.logger.warn(
            `Paiement ${ref} toujours en attente chez le fournisseur apres 24 h : a verifier`,
          );
          continue;
        }

        try {
          await this.verify(ref);
        } catch (error) {
          // MVola (la sandbox surtout) repond parfois en erreur : on retente
          this.logger.warn(`Statut illisible pour ${ref} : ${String(error)}`);
        }
      }
    } finally {
      this.polling = false;
    }
  }

  private async verify(ref: string) {
    const outcome = await this.provider!.checkStatus!(ref);
    if (!outcome) return;

    await this.handleOutcome(ref, outcome);
    this.watched.delete(ref);
  }

  private expireStale(
    db: Pick<PrismaService, 'payment'>,
    where: { id: string } | { orderId: string },
  ) {
    return db.payment.updateMany({
      where: {
        ...where,
        status: PAYMENT_TRANSACTION_STATUS.EN_ATTENTE,
        requestedAt: { lt: new Date(Date.now() - PENDING_PAYMENT_TTL_MS) },
      },
      data: {
        status: PAYMENT_TRANSACTION_STATUS.ECHOUE,
        failureReason: 'Aucune réponse dans le délai',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Issue d'un paiement, telle que l'annonce le fournisseur. Idempotent : un
   * fournisseur qui renvoie deux fois le meme callback ne paie pas deux fois,
   * l'ecriture etant conditionnee a `EN_ATTENTE`.
   *
   * Accepte, le paiement passe la commande a PAYEE par le meme `paymentData`
   * que la validation manuelle ; l'historique l'attribue au systeme
   * (`changedById: null`).
   */
  async handleOutcome(providerRef: string, outcome: PaymentOutcome) {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { providerRef },
        include: { order: { include: { store: true } } },
      });
      if (!payment) {
        throw new NotFoundException(`Paiement ${providerRef} inconnu`);
      }

      const settled = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: PAYMENT_TRANSACTION_STATUS.EN_ATTENTE,
        },
        data: {
          status: outcome.success
            ? PAYMENT_TRANSACTION_STATUS.REUSSI
            : PAYMENT_TRANSACTION_STATUS.ECHOUE,
          failureReason: outcome.success ? null : (outcome.reason ?? null),
          rawCallback: outcome.raw,
          completedAt: new Date(),
        },
      });
      if (settled.count === 0) return; // deja traite

      const { order } = payment;

      if (!outcome.success) {
        // une commande deja payee par une autre tentative le reste
        await tx.order.updateMany({
          where: { id: order.id, paymentStatus: { not: PAYMENT_STATUS.PAYE } },
          data: { paymentStatus: PAYMENT_STATUS.ECHOUE },
        });
        return;
      }

      const paid = await tx.order.updateMany({
        where: { id: order.id, status: ORDER_STATUS.EN_ATTENTE_PAIEMENT },
        data: { status: ORDER_STATUS.PAYEE, ...paymentData(order) },
      });
      if (paid.count === 0) {
        // annulee (ou validee a la main) pendant que le client payait
        this.logger.warn(
          `Paiement ${providerRef} recu pour ${order.number}, qui n'attendait plus de paiement : a rembourser ou verifier`,
        );
        return;
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: ORDER_STATUS.EN_ATTENTE_PAIEMENT,
          toStatus: ORDER_STATUS.PAYEE,
          changedById: null,
          note: `Paiement MVola confirmé (réf. ${providerRef})`,
        },
      });
    });
  }

  /**
   * Le simulateur n'a pas de callback : on se l'envoie a soi-meme apres
   * quelques secondes, le temps que le client « valide sur son telephone ».
   */
  private simulateCallback(providerRef: string, outcome: PaymentOutcome) {
    setTimeout(() => {
      this.handleOutcome(providerRef, outcome).catch((error: unknown) =>
        this.logger.error(
          `Confirmation simulee perdue pour ${providerRef} : ${String(error)}`,
        ),
      );
    }, MOCK_CONFIRMATION_DELAY_MS);
  }
}
