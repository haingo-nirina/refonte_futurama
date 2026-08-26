import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../common/constants';

export const ROLES_KEY = 'roles';

/**
 * Restreint une route a certains roles. Toujours combiner avec `JwtAuthGuard`,
 * qui renseigne `request.user` : seul, `RolesGuard` n'authentifie personne.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
