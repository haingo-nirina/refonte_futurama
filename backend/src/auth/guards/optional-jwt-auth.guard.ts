import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../jwt-payload';

/**
 * Laisse passer les requetes anonymes tout en renseignant `request.user` quand
 * un JWT valide est present. Utilise par le panier, ouvert aux visiteurs mais
 * rattache au compte des que le client est connecte.
 *
 * Un token present mais invalide ou expire est traite comme une absence de
 * token : la route reste accessible, en anonyme.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser | undefined>(
    _error: unknown,
    user: unknown,
  ): TUser {
    return (user || undefined) as TUser;
  }
}
