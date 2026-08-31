import { Matches } from 'class-validator';

/**
 * Un visuel — photo comme video — est soit televerse, et l'API renvoie alors
 * un chemin absolu (`/uploads/products/<uuid>.jpg`), soit heberge ailleurs, et
 * c'est une URL complete. `@IsUrl()` refuse le premier cas : il rejetait les
 * chemins servis par notre propre backend.
 */
const MEDIA_REF = /^(https?:\/\/[^\s]+|\/[^\s?#]*)$/;

export const IsMediaRef = () =>
  Matches(MEDIA_REF, {
    message:
      '$property doit etre une URL http(s) ou un chemin absolu commencant par /',
  });
