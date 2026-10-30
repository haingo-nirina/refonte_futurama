import { IsFacebookVideoLink } from './facebook-video-link.decorator';

export class StartLiveDto {
  @IsFacebookVideoLink()
  facebookUrl: string;
}
