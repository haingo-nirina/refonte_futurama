import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LIVE_STATUS, USER_ROLE } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { LiveCommentsService } from './live-comments.service';

function setup() {
  const prisma = {
    live: { findUnique: jest.fn() },
    liveMessage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
});
