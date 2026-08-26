import type { UserRole } from '../common/constants';

/** Charge utile signee dans le JWT : `sub` = User.id, selon la convention JWT. */
export type JwtPayload = {
  sub: string;
  role: UserRole;
};

/**
 * Ce que la strategie JWT depose sur `request.user`, et ce que le decorateur
 * `@CurrentUser()` renvoie aux controllers.
 */
export type AuthenticatedUser = {
  userId: string;
  role: UserRole;
};
