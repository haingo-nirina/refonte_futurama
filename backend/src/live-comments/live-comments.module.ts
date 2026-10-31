import { Module } from '@nestjs/common';
import { LiveCommentsController } from './live-comments.controller';
import { LiveCommentsService } from './live-comments.service';

@Module({
  controllers: [LiveCommentsController],
  providers: [LiveCommentsService],
})
export class LiveCommentsModule {}
