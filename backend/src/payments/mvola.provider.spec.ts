import { Prisma } from '@prisma/client';
import { MvolaProvider, mvolaDescription } from './mvola.provider';

const CONFIG = {
  baseUrl: 'https://devapi.mvola.mg',
  consumerKey: 'key',
  consumerSecret: 'secret',
  partnerName: 'futurama',
  merchantMsisdn: '0343500004',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('MvolaProvider', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  function mockToken() {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { access_token: 'tok', expires_in: 3600 }),
    );
  }

  it('envoie la demande et renvoie la reference MVola', async () => {
    mockToken();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(202, { status: 'pending', serverCorrelationId: 'scid-1' }),
    );

    const result = await new MvolaProvider(CONFIG).request({
      reference: 'ref-1',
      amount: new Prisma.Decimal('28000.00'),
      phone: '0343500003',
      description: 'Commande FUT-2026-000007',
    });

    expect(result).toEqual({ providerRef: 'scid-1' });
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe(
      'https://devapi.mvola.mg/mvola/mm/transactions/type/merchantpay/1.0.0/',
    );
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.amount).toBe('28000');
    expect(body.debitParty).toEqual([{ key: 'msisdn', value: '0343500003' }]);
    expect(body.creditParty).toEqual([{ key: 'msisdn', value: '0343500004' }]);
  });

  it('reutilise le token tant qu il est valide', async () => {
    const provider = new MvolaProvider(CONFIG);
    mockToken();
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(200, { status: 'pending' })),
    );

    await provider.checkStatus('a');
    await provider.checkStatus('b');

    const tokenCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/token'),
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it.each([
    ['pending', null],
    ['completed', true],
    ['failed', false],
  ])('statut %s', async (status, success) => {
    mockToken();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status }));

    const outcome = await new MvolaProvider(CONFIG).checkStatus('scid');

    expect(outcome === null ? null : outcome.success).toBe(success);
  });

  it("n'expose pas le token dans l'erreur", async () => {
    mockToken();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { errorDescription: 'Error in getting transaction' }),
    );

    const error = (await new MvolaProvider(CONFIG)
      .checkStatus('scid')
      .catch((e: unknown) => e)) as Error;

    expect(error.message).toContain('Error in getting transaction');
    expect(error.message).not.toContain('tok');
  });

  it('redemande un token apres un 401', async () => {
    const provider = new MvolaProvider(CONFIG);
    mockToken();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { fault: { message: 'Invalid Credentials' } }),
    );

    const error = (await provider
      .checkStatus('a')
      .catch((e: unknown) => e)) as Error;
    expect(error.message).toContain('Invalid Credentials');

    mockToken();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: 'pending' }));
    await provider.checkStatus('b');

    const tokenCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/token'),
    );
    expect(tokenCalls).toHaveLength(2);
  });
});

describe('mvolaDescription', () => {
  it('retire accents et caracteres speciaux', () => {
    expect(mvolaDescription('Commande n°FUT-2026 « été »')).toBe(
      'Commande n FUT-2026   ete',
    );
  });

  it('coupe a 50 caracteres', () => {
    expect(mvolaDescription('a'.repeat(80))).toHaveLength(50);
  });
});
