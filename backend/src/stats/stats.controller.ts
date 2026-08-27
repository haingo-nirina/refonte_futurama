import { Controller, Get } from '@nestjs/common';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { StatsService } from './stats.service';

/** Agregats du tableau de bord : reserve au backoffice, rien n'est public. */
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @AdminOnly()
  dashboard() {
    return this.statsService.dashboard();
  }
}
