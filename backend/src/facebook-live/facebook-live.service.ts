import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LivesService } from '../lives/lives.service';

/** Dernier live vu en cours sur la Page : sert a ne synchroniser que les changements. */
export type CurrentFacebookLive = {
  id: string;
  title: string;
  url: string;
  detectedAt: Date;
};

/** Element de `GET /{page-id}/live_videos`, limite aux `fields` demandes. */
type GraphLiveVideo = {
  id: string;
  title?: string;
  permalink_url?: string;
};

type GraphError = {
  message: string;
  type?: string;
  code: number;
  error_subcode?: number;
};

/** La Graph API renvoie soit `data`, soit `error` — jamais les deux. */
type GraphLiveVideosResponse = {
  data?: GraphLiveVideo[];
  error?: GraphError;
};

type FacebookConfig = {
  pageId: string;
  pageToken: string;
  graphVersion: string;
};

const DEFAULT_GRAPH_VERSION = 'v26.0';
const FACEBOOK_ORIGIN = 'https://www.facebook.com';
/** Token invalide, expire ou revoque (OAuthException). */
const GRAPH_INVALID_TOKEN_CODE = 190;
/** Un appel plus long que l'intervalle du cron se chevaucherait avec le suivant. */
const REQUEST_TIMEOUT_MS = 10_000;

function readConfig(): FacebookConfig | null {
  const pageId = process.env.FB_PAGE_ID?.trim();
  const pageToken = process.env.FB_PAGE_TOKEN?.trim();
  if (!pageId || !pageToken) return null;
  return {
    pageId,
    pageToken,
    graphVersion: process.env.FB_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION,
  };
}

/**
 * Detecte le live en cours sur la Page Facebook en interrogeant la Graph API
 * toutes les 30 s. Le resultat vit en memoire : il n'a de sens que tant que le
 * live dure, et un redemarrage le retrouve au premier appel.
 *
 * Facultative : sans `FB_PAGE_ID` / `FB_PAGE_TOKEN`, la vendeuse lance et
 * termine le live a la main depuis le backoffice. Active, elle fait la meme
 * chose toute seule : chaque changement (debut, fin, autre video) est reporte
 * sur les lives en base (`LivesService.syncWithFacebook`), que lisent
 * `GET /live/current` et la page /live. Une synchronisation ratee est retentee
 * au tick suivant.
 *
 * Le token est dans l'URL de la requete : ni l'URL ni le token ne sont jamais
 * journalises, et tout message d'erreur est expurge avant d'etre logue.
 */
@Injectable()
export class FacebookLiveService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FacebookLiveService.name);
  private readonly config = readConfig();
  private current: CurrentFacebookLive | null = null;
  private polling = false;
  /** Faux tant qu'aucune detection n'a ete reportee en base depuis le demarrage. */
  private synced = false;
  /** Derniere erreur loguee : evite de repeter le meme message toutes les 30 s. */
  private lastLoggedError: string | null = null;

  constructor(private readonly livesService: LivesService) {
    if (!this.config) {
      this.logger.warn(
        'FB_PAGE_ID ou FB_PAGE_TOKEN absent : detection des lives Facebook desactivee.',
      );
    }
  }

  /** Premiere detection au demarrage, sans attendre le premier tick du cron. */
  onApplicationBootstrap() {
    void this.poll();
  }

  getCurrent(): CurrentFacebookLive | null {
    return this.current;
  }

  @Cron('*/30 * * * * *', { name: 'facebook-live-poll' })
  async poll(): Promise<void> {
    if (!this.config || this.polling) return;
    this.polling = true;
    try {
      await this.refresh(this.config);
    } finally {
      this.polling = false;
    }
  }

  private async refresh(config: FacebookConfig): Promise<void> {
    const params = new URLSearchParams({
      broadcast_status: '["LIVE"]',
      fields: 'id,title,permalink_url',
      access_token: config.pageToken,
    });
    const url = `https://graph.facebook.com/${config.graphVersion}/${config.pageId}/live_videos?${params}`;

    let body: GraphLiveVideosResponse;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      body = (await response.json()) as GraphLiveVideosResponse;
    } catch (error) {
      // Reseau coupe, timeout ou corps illisible : on garde la derniere valeur.
      const message = error instanceof Error ? error.message : String(error);
      this.logOnce(`Graph API injoignable : ${message}`);
      return;
    }

    if (body.error) {
      if (body.error.code === GRAPH_INVALID_TOKEN_CODE) {
        this.logOnce(
          'Token Facebook invalide ou expire, a regenerer (FB_PAGE_TOKEN).',
        );
      } else {
        this.logOnce(
          `Graph API en erreur (code ${body.error.code}) : ${body.error.message}`,
        );
      }
      return;
    }

    const next = this.toCurrent(body.data ?? []);
    if (this.synced && next?.id === this.current?.id) {
      this.lastLoggedError = null;
      return;
    }

    try {
      await this.livesService.syncWithFacebook(
        next && { url: next.url, title: next.title },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logOnce(`Synchronisation du live en base impossible : ${message}`);
      return;
    }

    this.lastLoggedError = null;
    this.synced = true;
    this.current = next;
  }

  /** Le premier live exploitable ; `detectedAt` est conserve tant que l'id ne change pas. */
  private toCurrent(videos: GraphLiveVideo[]): CurrentFacebookLive | null {
    const video = videos.find((candidate) => candidate.permalink_url);
    if (!video?.permalink_url) return null;
    if (this.current?.id === video.id) return this.current;

    // `permalink_url` est relatif (`/<page>/videos/<id>/`) ; on tolere l'absolu.
    const url = video.permalink_url.startsWith('http')
      ? video.permalink_url
      : `${FACEBOOK_ORIGIN}${video.permalink_url}`;

    this.logger.log(`Live Facebook detecte : ${video.id}`);
    return {
      id: video.id,
      title: video.title?.trim() ?? '',
      url,
      detectedAt: new Date(),
    };
  }

  private logOnce(message: string) {
    const safe = this.redact(message);
    if (safe === this.lastLoggedError) return;
    this.lastLoggedError = safe;
    this.logger.error(safe);
  }

  private redact(message: string): string {
    const token = this.config?.pageToken;
    return token ? message.split(token).join('[FB_PAGE_TOKEN]') : message;
  }
}
