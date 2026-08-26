import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

const DEFAULT_EXPIRES_IN = '7d';

@Module({
  imports: [
    PassportModule,
    // registerAsync et non register : la factory est evaluee a l'init du
    // module, une fois dotenv charge par main.ts.
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
          throw new Error('JWT_SECRET est absent de l environnement');
        }

        return {
          secret,
          signOptions: {
            // Cast : @nestjs/jwt attend le format `ms` (`'7d'`, `'2h'`...),
            // que process.env ne peut pas garantir a la compilation.
            expiresIn: (process.env.JWT_EXPIRES_IN ??
              DEFAULT_EXPIRES_IN) as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
