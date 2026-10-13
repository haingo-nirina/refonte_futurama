import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CartService, mergedQuantity } from './cart.service';

type FakeCart = {
  id: string;
  userId: string | null;
  sessionId: string | null;
  createdAt: Date;
};
type FakeItem = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  createdAt: Date;
};

/**
 * Base en memoire, limitee a ce que CartService.getCart utilise : les tests
 * tournent sans Aiven et verifient l'etat final des paniers, pas la suite
 * exacte des appels Prisma.
 */
function createFakePrisma(stock: Record<string, number>) {
  const carts: FakeCart[] = [];
  const items: FakeItem[] = [];
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-${++seq}`;

  const matches = (cart: FakeCart, where: Partial<FakeCart>) =>
    Object.entries(where).every(
      ([key, value]) => cart[key as keyof FakeCart] === value,
    );
  const withItems = (cart: FakeCart) => ({
    ...cart,
    items: items
      .filter((item) => item.cartId === cart.id)
      .map((item) => ({ ...item, product: { id: item.productId } })),
  });

  const client = {
    cart: {
      findFirst: jest.fn(
        ({ where }: { where: Partial<FakeCart> }) =>
          [...carts]
            .reverse()
            .filter((cart) => matches(cart, where))
            .map(withItems)[0] ?? null,
      ),
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        const cart = carts.find((c) => c.id === where.id);
        return cart ? withItems(cart) : null;
      }),
      create: jest.fn(({ data }: { data: Partial<FakeCart> }) => {
        const cart: FakeCart = {
          id: nextId('cart'),
          userId: data.userId ?? null,
          sessionId: data.sessionId ?? null,
          createdAt: new Date(),
        };
        carts.push(cart);
        return withItems(cart);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<FakeCart>;
        }) => {
          const cart = carts.find((c) => c.id === where.id)!;
          Object.assign(cart, data);
          return withItems(cart);
        },
      ),
      delete: jest.fn(({ where }: { where: { id: string } }) => {
        carts.splice(
          carts.findIndex((c) => c.id === where.id),
          1,
        );
        // onDelete: Cascade
        for (let i = items.length - 1; i >= 0; i--) {
          if (items[i].cartId === where.id) items.splice(i, 1);
        }
      }),
    },
    cartItem: {
      create: jest.fn(
        ({ data }: { data: Omit<FakeItem, 'id' | 'createdAt'> }) => {
          items.push({ ...data, id: nextId('item'), createdAt: new Date() });
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<FakeItem>;
        }) => {
          Object.assign(
            items.find((i) => i.id === where.id)!,
            data,
          );
        },
      ),
    },
    product: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id, stock: stock[id] ?? 0 })),
      ),
    },
    // le client lui-meme fait office de transaction
    $transaction: jest.fn((run: (tx: unknown) => unknown) => transaction(run)),
  };

  const seedCart = (
    cart: Omit<FakeCart, 'id' | 'createdAt'>,
    lines: Record<string, number>,
  ) => {
    const created: FakeCart = {
      ...cart,
      id: nextId('cart'),
      createdAt: new Date(),
    };
    carts.push(created);
    for (const [productId, quantity] of Object.entries(lines)) {
      items.push({
        id: nextId('item'),
        cartId: created.id,
        productId,
        quantity,
        unitPrice: new Prisma.Decimal(1000),
        createdAt: new Date(),
      });
    }
    return created;
  };

  function transaction(run: (tx: unknown) => unknown): unknown {
    return run(client);
  }

  return { client, carts, items, seedCart };
}

/** Le faux client ne couvre qu'une partie de l'API Prisma. */
const asPrisma = (client: unknown): PrismaService => client as PrismaService;

const quantities = (cart: {
  items: { productId: string; quantity: number }[];
}) =>
  Object.fromEntries(cart.items.map((item) => [item.productId, item.quantity]));

describe('CartService.getCart', () => {
  it('fusionne le panier visiteur dans celui du compte, plafonne au stock', async () => {
    const db = createFakePrisma({ slurm: 5, popplers: 10, casque: 3 });
    db.seedCart(
      { userId: 'hubert', sessionId: 'ancien-navigateur' },
      { slurm: 3, casque: 1 },
    );
    const guest = db.seedCart(
      { userId: null, sessionId: 'navigateur' },
      { slurm: 4, popplers: 2 },
    );
    const service = new CartService(asPrisma(db.client));

    const cart = await service.getCart('navigateur', 'hubert');

    // slurm : 3 + 4 = 7, plafonne au stock de 5 ; popplers repris ; casque garde
    expect(quantities(cart)).toEqual({ slurm: 5, popplers: 2, casque: 1 });
    expect(cart.userId).toBe('hubert');
    // le panier visiteur a disparu, une seule ligne par produit
    expect(db.carts.some((c) => c.id === guest.id)).toBe(false);
    expect(db.items.filter((i) => i.cartId === cart.id)).toHaveLength(3);
  });

  it('ignore un panier de session rattache a un autre compte, sans erreur', async () => {
    const db = createFakePrisma({ slurm: 5, popplers: 10 });
    const leela = db.seedCart(
      { userId: 'leela', sessionId: 'navigateur' },
      { slurm: 2 },
    );
    db.seedCart({ userId: 'hubert', sessionId: 'autre' }, { popplers: 1 });
    const service = new CartService(asPrisma(db.client));

    const cart = await service.getCart('navigateur', 'hubert');

    expect(cart.userId).toBe('hubert');
    expect(quantities(cart)).toEqual({ popplers: 1 });
    // le panier de Leela est intact et toujours a elle
    expect(db.carts.find((c) => c.id === leela.id)?.userId).toBe('leela');
    expect(db.items.filter((i) => i.cartId === leela.id)).toHaveLength(1);
  });

  it("cree un panier neuf pour le compte quand celui de la session est a quelqu'un d'autre", async () => {
    const db = createFakePrisma({ slurm: 5 });
    db.seedCart({ userId: 'leela', sessionId: 'navigateur' }, { slurm: 2 });
    const service = new CartService(asPrisma(db.client));

    const cart = await service.getCart('navigateur', 'hubert');

    expect(cart.userId).toBe('hubert');
    expect(cart.items).toHaveLength(0);
  });

  it("ne sert jamais le panier d'un compte a un visiteur anonyme", async () => {
    const db = createFakePrisma({ slurm: 5 });
    db.seedCart({ userId: 'leela', sessionId: 'navigateur' }, { slurm: 2 });
    const service = new CartService(asPrisma(db.client));

    const cart = await service.getCart('navigateur');

    expect(cart.userId).toBeNull();
    expect(cart.items).toHaveLength(0);
  });
});

describe('mergedQuantity', () => {
  it('additionne les deux paniers', () => {
    expect(mergedQuantity(1, 2, 10)).toBe(3);
  });

  it('plafonne au stock', () => {
    expect(mergedQuantity(3, 4, 5)).toBe(5);
  });

  it('ne retire jamais ce que le compte avait deja', () => {
    expect(mergedQuantity(4, 2, 2)).toBe(4);
  });

  it('ne reprend rien quand le stock est epuise', () => {
    expect(mergedQuantity(0, 3, 0)).toBe(0);
  });
});
