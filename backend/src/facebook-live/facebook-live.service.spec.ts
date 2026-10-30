import { Logger } from '@nestjs/common';
import { LivesService } from '../lives/lives.service';
import { FacebookLiveService } from './facebook-live.service';

const TOKEN = 'EAAG-secret-page-token';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}

const LIVE = {
  id: 'live-1',
  title: 'Destockage Moulinex',
  permalink_url: '/FuturamaMg/videos/123456/',
};

describe('FacebookLiveService', () => {
  const savedEnv = { ...process.env };
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let errorSpy: jest.SpiedFunction<Logger['error']>;
  let warnSpy: jest.SpiedFunction<Logger['warn']>;
  let sync: jest.Mock<Promise<void>, [unknown]>;

  /** Seule la synchronisation des lives est utilisee par la detection. */
  function createService() {
    return new FacebookLiveService({
      syncWithFacebook: sync,
    } as unknown as LivesService);
  }

  beforeEach(() => {
    process.env.FB_PAGE_ID = 'page-42';
    process.env.FB_PAGE_TOKEN = TOKEN;
    delete process.env.FB_GRAPH_VERSION;
    fetchMock = jest.spyOn(global, 'fetch');
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    sync = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...savedEnv };
  });

  /** Aucun log ne doit jamais contenir le token. */
  function expectTokenNeverLogged() {
    for (const spy of [errorSpy, warnSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(TOKEN);
      }
    }
  }

  it('expose le live en cours avec une URL absolue', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [LIVE] }));
    const service = createService();

    await service.poll();

    expect(service.getCurrent()).toEqual({
      id: 'live-1',
      title: 'Destockage Moulinex',
      url: 'https://www.facebook.com/FuturamaMg/videos/123456/',
      detectedAt: expect.any(Date) as Date,
    });
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe('/v26.0/page-42/live_videos');
    expect(calledUrl.searchParams.get('broadcast_status')).toBe('["LIVE"]');
  });

  it('garde detectedAt tant que le meme live continue', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ data: [LIVE] })),
    );
    const service = createService();

    await service.poll();
    const first = service.getCurrent();
    await service.poll();

    expect(service.getCurrent()).toBe(first);
  });

  it('repasse a null quand le live est termine', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [LIVE] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    const service = createService();

    await service.poll();
    await service.poll();

    expect(service.getCurrent()).toBeNull();
  });

  it("garde la derniere valeur connue sur une erreur de l'API", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [LIVE] }))
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: 'Rate limit', code: 4 } }),
      )
      .mockRejectedValueOnce(new TypeError(`fetch failed for ${TOKEN}`));
    const service = createService();

    await service.poll();
    await service.poll();
    await service.poll();

    expect(service.getCurrent()?.id).toBe('live-1');
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expectTokenNeverLogged();
  });

  it('signale clairement un token invalide (code 190), une seule fois', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          error: {
            message: 'Error validating access token',
            type: 'OAuthException',
            code: 190,
          },
        }),
      ),
    );
    const service = createService();

    await service.poll();
    await service.poll();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('a regenerer');
    expect(service.getCurrent()).toBeNull();
    expectTokenNeverLogged();
  });

  it("ne fait rien si les variables d'environnement manquent", async () => {
    delete process.env.FB_PAGE_TOKEN;
    const service = createService();

    await service.poll();
    await service.poll();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(service.getCurrent()).toBeNull();
  });

  it('ne reporte en base que les changements de direct', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: [LIVE] }))
      .mockResolvedValueOnce(jsonResponse({ data: [LIVE] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    const service = createService();

    for (let tick = 0; tick < 4; tick++) await service.poll();

    // Demarrage (rien), debut du direct, fin du direct : pas la relecture.
    expect(sync.mock.calls).toEqual([
      [null],
      [
        {
          url: 'https://www.facebook.com/FuturamaMg/videos/123456/',
          title: 'Destockage Moulinex',
        },
      ],
      [null],
    ]);
  });

  it("n'expose pas un direct que la base n'a pas pu enregistrer", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ data: [LIVE] })),
    );
    sync
      .mockRejectedValueOnce(new Error('Aiven injoignable'))
      .mockResolvedValueOnce(undefined);
    const service = createService();

    await service.poll();
    expect(service.getCurrent()).toBeNull();

    await service.poll();
    expect(service.getCurrent()?.id).toBe('live-1');
    expect(sync).toHaveBeenCalledTimes(2);
  });
});
