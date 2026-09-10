import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { IsMediaRef } from '../../common/is-media-ref.decorator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug doit etre en minuscules, mots separes par des tirets',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  /**
   * Televersee (`/uploads/posts/<uuid>.jpg`) ou hebergee ailleurs : les deux
   * formes sont acceptees, d'ou `@IsMediaRef` plutot que `@IsUrl`. `null`
   * detache la photo, `undefined` laisse la valeur en place.
   */
  @IsOptional()
  @IsMediaRef()
  photoUrl?: string | null;

  /**
   * Vide, la publication reste un brouillon ; une date a venir la programme.
   * `null` la retire du mur sans la supprimer.
   */
  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;
}
