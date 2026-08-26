import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../jwt-payload';

/**
 * Injecte l'utilisateur porte par le JWT. Renvoie `undefined` sur une route
 * couverte par `OptionalJwtAuthGuard` quand l'appelant est anonyme.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    return request.user;
  },
);
