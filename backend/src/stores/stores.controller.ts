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
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoresService } from './stores.service';

/**
 * Lecture publique des boutiques actives : le panier propose le retrait.
 * Toute ecriture, et la liste complete, sont reservees a l'admin.
 */
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  findActive() {
    return this.storesService.findActive();
  }

  @Get('admin')
  @AdminOnly()
  findAllForAdmin() {
    return this.storesService.findAllForAdmin();
  }

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Patch(':id')
  @AdminOnly()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.storesService.remove(id);
  }
}
