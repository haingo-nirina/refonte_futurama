import { Controller, Get } from '@nestjs/common';
import { DeliveryZonesService } from './delivery-zones.service';

/** Lecture publique : le panier en a besoin avant toute connexion. */
@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(private readonly deliveryZonesService: DeliveryZonesService) {}

  @Get()
  findActive() {
    return this.deliveryZonesService.findActive();
  }
}
