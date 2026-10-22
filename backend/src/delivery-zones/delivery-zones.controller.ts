import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { DeliveryZonesService } from './delivery-zones.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

/**
 * Lecture publique des zones actives : le panier en a besoin avant toute
 * connexion. Toute ecriture, et la liste complete, sont reservees a l'admin.
 */
@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(private readonly deliveryZonesService: DeliveryZonesService) {}

  @Get()
  findActive() {
    return this.deliveryZonesService.findActive();
  }

  @Get('admin')
  @AdminOnly()
  findAllForAdmin() {
    return this.deliveryZonesService.findAllForAdmin();
  }

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateDeliveryZoneDto) {
    return this.deliveryZonesService.create(dto);
  }

  @Patch(':id')
  @AdminOnly()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryZoneDto,
  ) {
    return this.deliveryZonesService.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryZonesService.remove(id);
  }
}
