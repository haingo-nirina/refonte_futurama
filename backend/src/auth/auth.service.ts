import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { USER_ROLE } from '../common/constants';
import type { UserRole } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './jwt-payload';

const BCRYPT_ROUNDS = 10;
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          fullName: dto.fullName,
          phone: dto.phone ?? null,
          address: dto.address ?? null,
          role: USER_ROLE.CUSTOMER,
        },
      });

      return this.sign(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Cet email est deja utilise');
      }

      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Meme message et meme code dans les deux cas : ne pas reveler quels
    // emails existent en base.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    return this.sign(user);
  }

  /**
   * Profil du porteur du token, relu en base.
   *
   * Le JWT porte `role` sans aller-retour en base : c'est ce qui permet de
   * ne pas requeter a chaque appel, mais ca rend le role du token perimable.
   * Le backoffice ne peut pas s'en contenter pour ouvrir son shell — il
   * verifie ici que le compte existe *encore* et qu'il est *toujours* admin.
   */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Compte introuvable');
    }

    return this.toPublicUser(user);
  }

  /** Le hash ne doit jamais sortir du service. */
  private sign(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as UserRole,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      role: user.role,
    };
  }
}
