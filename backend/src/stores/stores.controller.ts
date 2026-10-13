import { Controller, Get } from '@nestjs/common';
import { StoresService } from './stores.service';

/** Lecture publique : le panier affiche la boutique de retrait. */
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  findActive() {
    return this.storesService.findActive();
  }
}
