import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { StartLiveDto } from './start-live.dto';

const VIDEO =
  'https://www.facebook.com/61580624460639/videos/2144347962842908/';

function parse(facebookUrl: string) {
  const dto = plainToInstance(StartLiveDto, { facebookUrl });
  return { dto, valid: validateSync(dto).length === 0 };
}

describe('StartLiveDto', () => {
  it.each([
    VIDEO,
    'https://m.facebook.com/watch/?v=1234567890',
    `  ${VIDEO}  `,
  ])('accepte un lien de video : %s', (url) => {
    expect(parse(url).valid).toBe(true);
  });

  it('extrait le lien du code « Intégrer à un site »', () => {
    const code = `<iframe src="https://www.facebook.com/plugins/video.php?height=314&amp;href=${encodeURIComponent(VIDEO)}&amp;show_text=false&amp;width=560&amp;t=0" width="560" height="314" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen="true"></iframe>`;

    const { dto, valid } = parse(code);

    expect(valid).toBe(true);
    expect(dto.facebookUrl).toBe(VIDEO);
  });

  it.each([
    'https://www.facebook.com/share/v/1TW58j5hzU/',
    'https://fb.watch/aBcD123/',
    'https://www.facebook.com/live/producer/1435728257956325/',
    'http://www.facebook.com/futurama.mg/videos/1/',
    'https://evilfacebook.com/videos/1/',
    'https://facebook.com.evil.io/videos/1/',
    'https://www.youtube.com/watch?v=1',
    '<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fevil.example%2F"></iframe>',
    'javascript:alert(1)',
    '   ',
  ])('refuse : %s', (url) => {
    expect(parse(url).valid).toBe(false);
  });
});
