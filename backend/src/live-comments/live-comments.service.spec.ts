import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { LIVE_STATUS, USER_ROLE } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { LiveCommentsService } from './live-comments.service';

function setup() {
  const prisma = {
    live: { findUnique: jest.fn() },
    liveMessage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new LiveCommentsService(prisma as unknown as PrismaService);

  return { prisma, service };
}

const row = (role: string) => ({
  id: 'c-1',
  liveId: 'live-1',
  message: 'Bonjour',
  createdAt: new Date('2026-10-30T12:00:00Z'),
  user: { id: 'u-1', fullName: 'Rasoa', role },
});

describe('LiveCommentsService', () => {
  it('signe la boutique sans exposer le role', async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      status: LIVE_STATUS.EN_DIRECT,
      replayVisible: true,
    });
    prisma.liveMessage.findMany.mockResolvedValue([
      row(USER_ROLE.ADMIN),
      row(USER_ROLE.CUSTOMER),
    ]);

    const { data } = await service.findAll('live-1');

    expect(data.map((c) => c.fromShop)).toEqual([false, true]);
    expect(data[0].user).toEqual({ id: 'u-1', fullName: 'Rasoa' });
  });

  it('cache le fil d’un live retire des replays', async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      status: LIVE_STATUS.TERMINE,
      replayVisible: false,
    });

    await expect(service.findAll('live-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("laisse l'admin lire le fil d'un replay retire", async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      status: LIVE_STATUS.TERMINE,
      replayVisible: false,
    });
    prisma.liveMessage.findMany.mockResolvedValue([]);

    await expect(service.findAll('live-1', { isAdmin: true })).resolves.toEqual(
      { data: [] },
    );
  });

  it("refuse de supprimer le commentaire d'un autre client", async () => {
    const { prisma, service } = setup();
    prisma.liveMessage.findUnique.mockResolvedValue({
      liveId: 'live-1',
      userId: 'u-2',
    });

    await expect(
      service.remove('live-1', 'c-1', { userId: 'u-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("laisse l'admin moderer", async () => {
    const { prisma, service } = setup();
    prisma.liveMessage.findUnique.mockResolvedValue({
      liveId: 'live-1',
      userId: 'u-2',
    });

    await service.remove('live-1', 'c-1', { userId: 'admin', isAdmin: true });

    expect(prisma.liveMessage.delete).toHaveBeenCalled();
  });

  it("refuse un commentaire qui n'appartient pas au live de l'URL", async () => {
    const { prisma, service } = setup();
    prisma.liveMessage.findUnique.mockResolvedValue({
      liveId: 'live-2',
      userId: 'u-1',
    });

    await expect(
      service.remove('live-1', 'c-1', { userId: 'u-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cache le fil d'un live termine sans video (pas un replay)", async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      status: LIVE_STATUS.TERMINE,
      replayVisible: true,
      facebookUrl: null,
    });

    await expect(service.findAll('live-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('sert le fil public depuis le cache, vide par une ecriture', async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      status: LIVE_STATUS.EN_DIRECT,
      replayVisible: true,
      facebookUrl: 'https://www.facebook.com/x/videos/1/',
    });
    prisma.liveMessage.findMany.mockResolvedValue([]);
    prisma.liveMessage.findFirst.mockResolvedValue(null);
    prisma.liveMessage.create.mockResolvedValue(row(USER_ROLE.CUSTOMER));

    await service.findAll('live-1');
    await service.findAll('live-1');
    expect(prisma.liveMessage.findMany).toHaveBeenCalledTimes(1);

    await service.create('live-1', { userId: 'u-1' }, { message: 'Bonjour' });
    await service.findAll('live-1');
    expect(prisma.liveMessage.findMany).toHaveBeenCalledTimes(2);
  });

  it('refuse en 429 un second commentaire trop rapproche', async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      status: LIVE_STATUS.EN_DIRECT,
      replayVisible: true,
      facebookUrl: 'https://www.facebook.com/x/videos/1/',
    });
    prisma.liveMessage.findFirst.mockResolvedValue({ id: 'c-0' });

    const attempt = service.create(
      'live-1',
      { userId: 'u-1' },
      { message: 'Encore' },
    );

    await expect(attempt).rejects.toBeInstanceOf(HttpException);
    await expect(attempt).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(prisma.liveMessage.create).not.toHaveBeenCalled();
  });

  it("n'impose pas de delai a l'equipe", async () => {
    const { prisma, service } = setup();
    prisma.live.findUnique.mockResolvedValue({
      status: LIVE_STATUS.EN_DIRECT,
      replayVisible: true,
      facebookUrl: 'https://www.facebook.com/x/videos/1/',
    });
    prisma.liveMessage.create.mockResolvedValue(row(USER_ROLE.ADMIN));

    await service.create(
      'live-1',
      { userId: 'admin', isAdmin: true },
      { message: 'Merci à tous' },
    );

    expect(prisma.liveMessage.findFirst).not.toHaveBeenCalled();
    expect(prisma.liveMessage.create).toHaveBeenCalled();
  });
});
