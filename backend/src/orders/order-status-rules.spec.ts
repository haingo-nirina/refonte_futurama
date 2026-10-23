import { FULFILLMENT_METHOD, ORDER_STATUS } from '../common/constants';
import { canTransition, nextStatuses } from './order-status-rules';

const { LIVRAISON, RETRAIT_BOUTIQUE } = FULFILLMENT_METHOD;

describe('order-status-rules', () => {
  it('suit le parcours complet en livraison', () => {
    expect(
      canTransition(
        ORDER_STATUS.EN_ATTENTE_PAIEMENT,
        ORDER_STATUS.PAYEE,
        LIVRAISON,
      ),
    ).toBe(true);
    expect(
      canTransition(ORDER_STATUS.PAYEE, ORDER_STATUS.EN_PREPARATION, LIVRAISON),
    ).toBe(true);
    expect(
      canTransition(
        ORDER_STATUS.EN_PREPARATION,
        ORDER_STATUS.EXPEDIEE,
        LIVRAISON,
      ),
    ).toBe(true);
    expect(
      canTransition(ORDER_STATUS.EXPEDIEE, ORDER_STATUS.LIVREE, LIVRAISON),
    ).toBe(true);
  });

  it('ne propose que les etapes du mode de reception', () => {
    expect(nextStatuses(ORDER_STATUS.EN_PREPARATION, LIVRAISON)).toEqual([
      ORDER_STATUS.EXPEDIEE,
      ORDER_STATUS.ANNULEE,
    ]);
    expect(nextStatuses(ORDER_STATUS.EN_PREPARATION, RETRAIT_BOUTIQUE)).toEqual(
      [ORDER_STATUS.PRETE_A_RETIRER, ORDER_STATUS.ANNULEE],
    );
  });

  it('refuse de sauter une etape', () => {
    expect(
      canTransition(
        ORDER_STATUS.EN_ATTENTE_PAIEMENT,
        ORDER_STATUS.EXPEDIEE,
        LIVRAISON,
      ),
    ).toBe(false);
  });

  it("refuse l'annulation apres expedition", () => {
    expect(
      canTransition(ORDER_STATUS.EXPEDIEE, ORDER_STATUS.ANNULEE, LIVRAISON),
    ).toBe(false);
  });

  it('accepte l annulation tant que la commande attend son retrait', () => {
    expect(
      canTransition(
        ORDER_STATUS.PRETE_A_RETIRER,
        ORDER_STATUS.ANNULEE,
        RETRAIT_BOUTIQUE,
      ),
    ).toBe(true);
  });

  it('ne fait plus bouger un statut final', () => {
    for (const status of [
      ORDER_STATUS.LIVREE,
      ORDER_STATUS.RETIREE,
      ORDER_STATUS.ANNULEE,
    ]) {
      expect(nextStatuses(status, LIVRAISON)).toEqual([]);
      expect(nextStatuses(status, RETRAIT_BOUTIQUE)).toEqual([]);
    }
  });
});
