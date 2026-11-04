import { randomUUID } from 'crypto';
import { PAYMENT_PROVIDER_NAME } from '../common/constants';
import type {
  PaymentOutcome,
  PaymentProvider,
  PaymentRequest,
  PaymentRequestResult,
} from './payment-provider';

const BASE_URLS = {
  sandbox: 'https://devapi.mvola.mg',
  production: 'https://api.mvola.mg',
} as const;

const MERCHANT_PAY_PATH = '/mvola/mm/transactions/type/merchantpay/1.0.0/';
const REQUEST_TIMEOUT_MS = 20_000;
/** Le token dure 1 h : on le renouvelle un peu avant. */
const TOKEN_MARGIN_MS = 60_000;
/** Limite de `descriptionText` cote MVola. */
const DESCRIPTION_MAX_LENGTH = 50;

export type MvolaConfig = {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  partnerName: string;
  merchantMsisdn: string;
  /** Adresse publique de `PUT /payments/mvola/callback`, facultative. */
  callbackUrl?: string;
};

/**
 * Lit la configuration dans `process.env`, comme `JWT_SECRET`. Une variable
 * manquante empeche le demarrage : mieux vaut qu'a la premiere commande.
 */
export function readMvolaConfig(): MvolaConfig {
  const env = process.env.MVOLA_ENV?.trim() || 'sandbox';
  if (env !== 'sandbox' && env !== 'production') {
    throw new Error(`MVOLA_ENV inconnu : ${env} (sandbox ou production)`);
  }

  const required = {
    consumerKey: 'MVOLA_CONSUMER_KEY',
    consumerSecret: 'MVOLA_CONSUMER_SECRET',
    partnerName: 'MVOLA_PARTNER_NAME',
    merchantMsisdn: 'MVOLA_MERCHANT_MSISDN',
  } as const;
  const values = {} as Record<keyof typeof required, string>;
  for (const [key, name] of Object.entries(required)) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} manquant (PAYMENT_PROVIDER=mvola)`);
    values[key as keyof typeof required] = value;
  }

  return {
    baseUrl: BASE_URLS[env],
    ...values,
    callbackUrl: process.env.MVOLA_CALLBACK_URL?.trim() || undefined,
  };
}

/**
 * API MVola « merchant pay » : la demande part sur le telephone du client,
 * qui la valide avec son code secret. L'issue se lit sur la route de statut —
 * le callback, lui, n'est pas signe et ne fait que declencher cette lecture.
 *
 * Le token d'acces ne sort jamais de cette classe : ni logue, ni dans les
 * messages d'erreur.
 */
export class MvolaProvider implements PaymentProvider {
  readonly name = PAYMENT_PROVIDER_NAME.MVOLA;

  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: MvolaConfig) {}

  async request(payment: PaymentRequest): Promise<PaymentRequestResult> {
    const body = {
      // MVola attend des ariary entiers, en texte
      amount: payment.amount.toFixed(0),
      currency: 'Ar',
      descriptionText: mvolaDescription(payment.description),
      requestingOrganisationTransactionReference: payment.reference,
      requestDate: new Date().toISOString(),
      originalTransactionReference: payment.reference,
      debitParty: [{ key: 'msisdn', value: payment.phone }],
      creditParty: [{ key: 'msisdn', value: this.config.merchantMsisdn }],
      metadata: [
        { key: 'partnerName', value: this.config.partnerName },
        { key: 'fc', value: 'USD' },
        { key: 'amountFc', value: '1' },
      ],
    };

    const data = await this.call('POST', MERCHANT_PAY_PATH, body);
    const ref = data.serverCorrelationId;
    if (typeof ref !== 'string' || !ref) {
      throw new Error('MVola : reponse sans serverCorrelationId');
    }

    return { providerRef: ref };
  }

  /** `null` tant que le client n'a ni valide ni refuse. */
  async checkStatus(providerRef: string): Promise<PaymentOutcome | null> {
    const data = await this.call(
      'GET',
      `${MERCHANT_PAY_PATH}status/${encodeURIComponent(providerRef)}`,
    );

    if (data.status === 'completed') {
      return { success: true, raw: data };
    }
    if (data.status === 'failed') {
      return {
        success: false,
        reason: 'Paiement refusé ou expiré sur MVola',
        raw: data,
      };
    }

    return null;
  }

  private async call(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<Record<string, string>> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${await this.accessToken()}`,
        Version: '1.0',
        // un identifiant neuf par appel : MVola refuse de le voir resservir
        'X-CorrelationID': randomUUID(),
        UserLanguage: 'FR',
        UserAccountIdentifier: `msisdn;${this.config.merchantMsisdn}`,
        partnerName: this.config.partnerName,
        'Cache-Control': 'no-cache',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(this.config.callbackUrl && method === 'POST'
          ? { 'X-Callback-URL': this.config.callbackUrl }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`MVola ${method} ${response.status} : ${errorOf(text)}`);
    }

    return JSON.parse(text) as Record<string, string>;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.value;
    }

    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`,
    ).toString('base64');
    const response = await fetch(`${this.config.baseUrl}/token`, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: 'grant_type=client_credentials&scope=EXT_INT_MVOLA_SCOPE',
    });

    if (!response.ok) {
      // 401 : cles invalides ou revoquees sur le portail MVola
      throw new Error(`MVola token ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_MARGIN_MS,
    };

    return this.token.value;
  }
}

/**
 * MVola refuse les caracteres speciaux dans `descriptionText` : on ne garde
 * que lettres, chiffres, espace et `-._,`.
 */
export function mvolaDescription(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ._,-]/g, ' ')
    .trim()
    .slice(0, DESCRIPTION_MAX_LENGTH);
}

/** Le message d'erreur MVola, sans recopier toute la reponse dans les logs. */
function errorOf(text: string): string {
  try {
    const data = JSON.parse(text) as { errorDescription?: string };
    return data.errorDescription ?? 'erreur sans description';
  } catch {
    return 'reponse illisible';
  }
}
