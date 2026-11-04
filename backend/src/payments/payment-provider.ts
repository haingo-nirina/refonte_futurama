import { Prisma } from '@prisma/client';
import type { PaymentProviderName } from '../common/constants';

/** Jeton d'injection du fournisseur choisi par `PAYMENT_PROVIDER`. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentRequest {
  /** Notre reference, unique par tentative : MVola la renvoie au callback. */
  reference: string;
  /** Relu sur la commande, jamais dans la requete du client. */
  amount: Prisma.Decimal;
  /** Numero qui paie, forme stockee 0341234567. */
  phone: string;
  /** Libelle affiche au client sur son telephone. */
  description: string;
}

/** Issue d'une tentative, telle que la rapporte le fournisseur. */
export interface PaymentOutcome {
  success: boolean;
  reason?: string;
  /** Ce que le fournisseur a renvoye, garde tel quel dans `rawCallback`. */
  raw?: Prisma.InputJsonValue;
}

export interface PaymentRequestResult {
  /** Reference du fournisseur, cle du callback (`Payment.providerRef`). */
  providerRef: string;
  /**
   * Seul le simulateur la renseigne : l'issue qu'aurait annoncee le callback.
   * Le vrai MVola repond plus tard, sur la route de callback.
   */
  simulatedOutcome?: PaymentOutcome;
}

/**
 * Ce que doit savoir faire un fournisseur de paiement : envoyer la demande au
 * telephone du client, puis dire ou elle en est.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  request(payment: PaymentRequest): Promise<PaymentRequestResult>;
  /**
   * Relit l'issue chez le fournisseur : `null` tant que rien n'est tranche.
   * Absent du simulateur, qui annonce son issue des la demande.
   */
  checkStatus?(providerRef: string): Promise<PaymentOutcome | null>;
}
