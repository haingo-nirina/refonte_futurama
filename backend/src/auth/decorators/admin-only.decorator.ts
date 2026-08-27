import { applyDecorators, UseGuards } from '@nestjs/common';
import { USER_ROLE } from '../../common/constants';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

/**
 * Reserve une route aux administrateurs : 401 sans token, 403 si le token
 * n'est pas admin.
 *
 * Encapsule l'ordre `JwtAuthGuard` puis `RolesGuard` : seul, `RolesGuard`
 * n'authentifie personne et laisserait passer un appel anonyme. Preferer ce
 * decorateur a la combinaison manuelle pour ne pas pouvoir se tromper.
 */
export const AdminOnly = () =>
  applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(USER_ROLE.ADMIN));
