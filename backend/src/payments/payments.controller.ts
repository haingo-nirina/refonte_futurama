import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { StartPaymentDto } from './dto/start-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Envoie la demande MVola au telephone du client, pour l'une de ses
   * commandes. Le suivi se lit ensuite sur `GET /payments/:id`.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartPaymentDto) {
    return this.paymentsService.start(dto.orderId, user.userId);
  }

  /**
   * Appelee par MVola, donc publique et sans DTO : le corps est un format
   * tiers, que `forbidNonWhitelisted` rejetterait au moindre champ ajoute par
   * MVola. Le service n'en lit que `serverCorrelationId`, et relit l'issue
   * chez MVola plutot que de croire le corps.
   */
  @Put('mvola/callback')
  callback(@Body() body: Record<string, unknown>) {
    return this.paymentsService.handleCallback(body);
  }

  /**
   * Publique : paiement MVola en ligne, ou mode manuel avec le numero de la
   * boutique. Declaree avant `:id`, que `ParseUUIDPipe` refuserait en 400.
   */
  @Get('config')
  config() {
    return this.paymentsService.getConfig();
  }

  /** Suivi d'une tentative, pour l'ecran « Validez sur votre telephone ». */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.findOne(id, user.userId);
  }
}
