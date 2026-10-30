import { Module } from '@nestjs/common';
import { LivesController } from './lives.controller';
import { LivesService } from './lives.service';
import { OnAirController } from './on-air.controller';

@Module({
  controllers: [LivesController, OnAirController],
  providers: [LivesService],
  exports: [LivesService],
})
export class LivesModule {}
