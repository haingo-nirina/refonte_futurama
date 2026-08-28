import { Matches } from 'class-validator';

/**
 * Un visuel est soit televerse — l'API renvoie alors un chemin absolu
 * (`/uploads/products/<uuid>.jpg`) — soit heberge ailleurs, et c'est une URL
 * complete. `@IsUrl()` refuse le premier cas : il rejetait les chemins servis
 * par notre propre backend.
 *
 * A ne pas utiliser pour une vraie ressource externe (une video par exemple),
 * ou `@IsUrl()` reste le bon controle.
 */
const IMAGE_REF = /^(https?:\/\/[^\s]+|\/[^\s?#]*)$/;

export const IsImageRef = () =>
  Matches(IMAGE_REF, {
    message:
      '$property doit etre une URL http(s) ou un chemin absolu commencant par /',
  });
