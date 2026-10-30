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
import { CreateLiveDto } from './dto/create-live.dto';
import { StartLiveDto } from './dto/start-live.dto';
import { UpdateLiveDto } from './dto/update-live.dto';
import { LivesService } from './lives.service';

/**
 * Seule `GET /lives/current` est publique, tout le reste est reserve a
 * l'admin. Le passage en direct se fait a la main (`POST /lives/:id/start`,
 * avec le lien copie depuis Facebook) ou par la detection (`facebook-live`).
 *
 * Les chemins fixes (`current`, `admin`) sont declares avant ceux a
 * parametre : Nest resout les routes dans l'ordre de declaration.
 */
@Controller('lives')
export class LivesController {
  constructor(private readonly livesService: LivesService) {}

  @Get('current')
  findCurrent() {
    return this.livesService.findCurrent();
  }

  @Get('admin')
  @AdminOnly()
  findAllForAdmin() {
    return this.livesService.findAllForAdmin();
  }

  @Get('admin/:id')
  @AdminOnly()
  findOneForAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.livesService.findOneForAdmin(id);
  }

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateLiveDto) {
    return this.livesService.create(dto);
  }

  @Patch(':id')
  @AdminOnly()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLiveDto) {
    return this.livesService.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.livesService.remove(id);
  }

  @Post(':id/start')
  @AdminOnly()
  start(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StartLiveDto) {
    return this.livesService.start(id, dto);
  }

  @Post(':id/end')
  @AdminOnly()
  end(@Param('id', ParseUUIDPipe) id: string) {
    return this.livesService.end(id);
  }
}
