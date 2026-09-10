import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

/**
 * `photoUrl: null` detache la photo et `publishedAt: null` repasse la
 * publication en brouillon — sans quoi une publication en ligne ne pourrait
 * plus etre retiree du mur. `undefined` laisse la valeur en place.
 */
export class UpdatePostDto extends PartialType(CreatePostDto) {}
