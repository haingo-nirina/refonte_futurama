/**
 * `Product.videoUrl` accepte deux choses (voir `@IsMediaRef` cote backend) :
 * un fichier televerse et servi sous `/uploads/videos`, ou le lien d'une video
 * hebergee ailleurs. Un `<video>` ne sait lire que le premier cas — une page
 * YouTube ou Facebook n'est pas un flux —, d'ou ce test partage entre le
 * lecteur de la fiche produit et l'apercu du backoffice.
 */
const PLAYABLE = /\.(mp4|webm|mov)(\?.*)?$/i;

export function isPlayableVideo(url: string): boolean {
  return PLAYABLE.test(url);
}
