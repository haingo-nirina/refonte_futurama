import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Exige un JWT valide : 401 sinon. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
