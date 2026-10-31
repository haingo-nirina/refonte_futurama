import { BadRequestException, ConflictException } from '@nestjs/common';
import { LIVE_STATUS } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { LivesService } from './lives.service';

const FB = 'https://www.facebook.com/futurama.mg/videos/1234567890/';
const DETECTED = { url: FB, title: 'Destockage Moulinex' };

/**
 * Prisma remplace par des `jest.fn()` : ces tests verifient les regles du
 * service (transitions de statut), pas les requetes SQL.
 */
function setup() {
  const prisma = {
    live: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(),
    },
  };
  // la transaction interactive recoit le meme client simule
  const client = {
    ...prisma,
    $transaction: (run: (tx: typeof prisma) => unknown) => run(prisma),
  };
  const service = new LivesService(client as unknown as PrismaService);

  return { prisma, service };
}

describe('LivesService.end', () => {
  it("refuse un live qui n'est pas en direct", async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      id: 'live-1',
      status: LIVE_STATUS.PROGRAMME,
    });

    await expect(service.end('live-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("repond 409 si le statut a change entre la lecture et l'ecriture", async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      id: 'live-1',
      status: LIVE_STATUS.EN_DIRECT,
    });
    prisma.live.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.end('live-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('LivesService.syncWithFacebook', () => {
  it('termine le live en direct quand Facebook ne diffuse plus rien', async () => {
    const { prisma, service } = setup();
    prisma.live.findFirst.mockResolvedValueOnce({
      id: 'live-1',
      facebookUrl: FB,
    });

    await service.syncWithFacebook(null);

    expect(prisma.live.updateMany).toHaveBeenCalledWith({
      where: { id: 'live-1', status: LIVE_STATUS.EN_DIRECT },
      data: {
        status: LIVE_STATUS.TERMINE,
        endedAt: expect.any(Date) as Date,
        replayVisible: true,
      },
    });
  });

  it('ne fait rien sans direct ni live en direct', async () => {
    const { prisma, service } = setup();
    prisma.live.findFirst.mockResolvedValueOnce(null);

    await service.syncWithFacebook(null);

    expect(prisma.live.updateMany).not.toHaveBeenCalled();
  });

  it('ne touche a rien si le direct est deja enregistre', async () => {
    const { prisma, service } = setup();
    prisma.live.findFirst.mockResolvedValueOnce({
      id: 'live-1',
      facebookUrl: FB,
    });

    await service.syncWithFacebook(DETECTED);

    expect(prisma.live.updateMany).not.toHaveBeenCalled();
    expect(prisma.live.create).not.toHaveBeenCalled();
  });

  it('ne relance pas un direct que la vendeuse a termine a la main', async () => {
    const { prisma, service } = setup();
    prisma.live.findFirst
      .mockResolvedValueOnce(null) // aucun live en direct
      .mockResolvedValueOnce({ id: 'live-1' }); // ce lien est deja connu

    await service.syncWithFacebook(DETECTED);

    expect(prisma.live.updateMany).not.toHaveBeenCalled();
    expect(prisma.live.create).not.toHaveBeenCalled();
  });

  it('met en direct le live programme le plus proche, avec le lien detecte', async () => {
    const { prisma, service } = setup();
    prisma.live.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'live-2' });

    await service.syncWithFacebook(DETECTED);

    expect(prisma.live.updateMany).toHaveBeenCalledWith({
      where: { id: 'live-2', status: LIVE_STATUS.PROGRAMME },
      data: {
        status: LIVE_STATUS.EN_DIRECT,
        startedAt: expect.any(Date) as Date,
        facebookUrl: FB,
      },
    });
    expect(prisma.live.create).not.toHaveBeenCalled();
  });

  it("cree un live quand rien n'etait programme", async () => {
    const { prisma, service } = setup();
    prisma.live.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await service.syncWithFacebook({ url: FB, title: '' });

    expect(prisma.live.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Live Facebook',
        status: LIVE_STATUS.EN_DIRECT,
        facebookUrl: FB,
      }) as object,
    });
  });

  it('termine le live precedent quand une autre video demarre', async () => {
    const { prisma, service } = setup();
    prisma.live.findFirst
      .mockResolvedValueOnce({ id: 'live-old', facebookUrl: 'https://x/old' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'live-2' });

    await service.syncWithFacebook(DETECTED);

    expect(prisma.live.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'live-old', status: LIVE_STATUS.EN_DIRECT },
      data: {
        status: LIVE_STATUS.TERMINE,
        endedAt: expect.any(Date) as Date,
        replayVisible: true,
      },
    });
    expect(prisma.live.updateMany).toHaveBeenCalledTimes(2);
  });
});

describe('LivesService.start', () => {
  it('passe le live en direct avec le lien colle et termine un autre direct', async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      id: 'live-1',
      status: LIVE_STATUS.PROGRAMME,
      startedAt: null,
    });

    await service.start('live-1', { facebookUrl: FB });

    expect(prisma.live.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'live-1', status: LIVE_STATUS.PROGRAMME },
      data: {
        status: LIVE_STATUS.EN_DIRECT,
        facebookUrl: FB,
        startedAt: expect.any(Date) as Date,
      },
    });
    expect(prisma.live.updateMany).toHaveBeenNthCalledWith(2, {
      where: { status: LIVE_STATUS.EN_DIRECT, id: { not: 'live-1' } },
      data: {
        status: LIVE_STATUS.TERMINE,
        endedAt: expect.any(Date) as Date,
        replayVisible: true,
      },
    });
  });

  it('garde la date de debut quand on corrige le lien en direct', async () => {
    const { prisma, service } = setup();
    const startedAt = new Date('2026-10-30T12:00:00Z');
    prisma.live.findUnique.mockResolvedValue({
      id: 'live-1',
      status: LIVE_STATUS.EN_DIRECT,
      startedAt,
    });

    await service.start('live-1', { facebookUrl: FB });

    expect(prisma.live.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'live-1', status: LIVE_STATUS.EN_DIRECT },
      data: { status: LIVE_STATUS.EN_DIRECT, facebookUrl: FB, startedAt },
    });
  });

  it('refuse un live termine', async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      id: 'live-1',
      status: LIVE_STATUS.TERMINE,
    });

    await expect(
      service.start('live-1', { facebookUrl: FB }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("repond 409 si le statut a change entre la lecture et l'ecriture", async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      id: 'live-1',
      status: LIVE_STATUS.PROGRAMME,
    });
    prisma.live.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.start('live-1', { facebookUrl: FB }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.live.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('LivesService.findOnAir', () => {
  it('garde la lecture en memoire, et la relit apres une ecriture', async () => {
    const { prisma, service } = setup();
    prisma.live.findFirst.mockResolvedValue({
      id: 'live-1',
      title: 'Destockage',
      facebookUrl: FB,
      startedAt: null,
    });

    expect(await service.findOnAir()).toEqual({
      id: 'live-1',
      title: 'Destockage',
      url: FB,
      startedAt: null,
    });
    await service.findOnAir();
    expect(prisma.live.findFirst).toHaveBeenCalledTimes(1);

    prisma.live.findUnique.mockResolvedValue({
      id: 'live-1',
      status: LIVE_STATUS.EN_DIRECT,
    });
    await service.end('live-1');
    await service.findOnAir();
    expect(prisma.live.findFirst).toHaveBeenCalledTimes(2);
  });
});

describe('LivesService.update', () => {
  it('refuse de changer le lien pendant le direct', async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      id: 'live-1',
      status: LIVE_STATUS.EN_DIRECT,
    });

    await expect(
      service.update('live-1', { facebookUrl: FB }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("prepare le lien d'un live programme sans le lancer", async () => {
    const { prisma, service } = setup();
    const update = jest
      .fn<Promise<unknown>, [{ data: Record<string, unknown> }]>()
      .mockResolvedValue({});
    Object.assign(prisma.live, { update });
    prisma.live.findUnique.mockResolvedValue({
      id: 'live-1',
      status: LIVE_STATUS.PROGRAMME,
    });

    await service.update('live-1', { facebookUrl: FB });

    const { data } = update.mock.calls[0][0];
    expect(data.facebookUrl).toBe(FB);
    expect(data.status).toBeUndefined();
  });
});

describe('LivesService.syncWithFacebook (lien prepare)', () => {
  it('demarre le live programme qui porte deja le lien detecte', async () => {
    const { prisma, service } = setup();
    prisma.live.findFirst
      .mockResolvedValueOnce(null) // aucun live en direct
      .mockResolvedValueOnce(null) // lien inconnu hors lives programmes
      .mockResolvedValueOnce({ id: 'live-2' }); // programme avec ce lien

    await service.syncWithFacebook(DETECTED);

    expect(prisma.live.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'live-2', status: LIVE_STATUS.PROGRAMME },
      }),
    );
    expect(prisma.live.create).not.toHaveBeenCalled();
  });
});
