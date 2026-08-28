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
import { CreateMarqueDto } from './dto/create-marque.dto';
import { UpdateMarqueDto } from './dto/update-marque.dto';
import { MarquesService } from './marques.service';

/**
 * Marques des produits. Lecture publique comme le catalogue : la facette
 * « Marques » de la boutique et le selecteur du formulaire produit s'en
 * servent. Toute ecriture est reservee a l'admin.
 */
@Controller('marques')
export class MarquesController {
  constructor(private readonly marquesService: MarquesService) {}

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateMarqueDto) {
    return this.marquesService.create(dto);
  }

  @Get()
  findAll() {
    return this.marquesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.marquesService.findOne(id);
  }

  @Patch(':id')
  @AdminOnly()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMarqueDto) {
    return this.marquesService.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.marquesService.remove(id);
  }
}
