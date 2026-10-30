import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

const EMBED_PLAYER = /plugins\/video\.php\?([^"'\s>]*)/;

/**
 * Le plus sur est de coller le code de « Intégrer à un site » (menu « … » de
 * la publication du live) : c'est le lecteur que Facebook genere lui-meme, et
 * son parametre `href` est exactement le lien qu'il sait lire. On l'en
 * extrait ; un lien colle seul est rendu tel quel (trimme).
 */
function toVideoLink({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const text = value.trim();
  const embed = EMBED_PLAYER.exec(text);
  if (!embed) return text;

  const query = embed[1].replace(/&amp;/g, '&');
  return new URLSearchParams(query).get('href')?.trim() ?? text;
}

export class StartLiveDto {
  /**
   * Lien de la video, ou code d'integration Facebook dont il est extrait.
   * Seuls les domaines Facebook passent : le lien finit dans le lecteur
   * integre de Facebook, rien d'autre ne saurait le lire.
   */
  @Transform(toVideoLink)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
      host_whitelist: [/(^|\.)facebook\.com$/],
    },
    {
      message:
        'Collez le code de « Intégrer à un site » ou le lien de la vidéo Facebook',
    },
  )
  // Le lien du Live Producer (le studio de diffusion) n'est visible que des
  // administrateurs de la Page : le lecteur integre afficherait « Vidéo non
  // disponible » a tous les visiteurs.
  @Matches(/^(?!.*\/live\/producer\b)/i, {
    message:
      'Ce lien est celui du studio de diffusion (Live Producer), privé : utilisez « Intégrer à un site » sur la publication du live',
  })
  // Un lien de partage (« Copier le lien ») redirige vers la video : le
  // navigateur suit, le lecteur integre non.
  @Matches(/^(?!.*facebook\.com\/share\/)/i, {
    message:
      'Ce lien de partage ne fonctionne pas dans le lecteur : utilisez « Intégrer à un site » sur la publication du live',
  })
  facebookUrl: string;
}
