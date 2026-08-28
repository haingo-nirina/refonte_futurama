import { Module } from '@nestjs/common';
import { MarquesController } from './marques.controller';
import { MarquesService } from './marques.service';

@Module({
  controllers: [MarquesController],
  providers: [MarquesService],
  exports: [MarquesService],
})
export class MarquesModule {}
