import { Module } from '@nestjs/common';
import { LivesModule } from '../lives/lives.module';
import { FacebookLiveService } from './facebook-live.service';

@Module({
  imports: [LivesModule],
  providers: [FacebookLiveService],
})
export class FacebookLiveModule {}
