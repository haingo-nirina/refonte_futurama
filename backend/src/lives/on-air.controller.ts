import { Controller, Get, Header } from '@nestjs/common';
import { LivesService } from './lives.service';

/**
 * Lecture publique du direct en cours, relue toutes les 30 s par chaque
 * visiteur (bandeau du header, page /live). Ne sort que ce que le site
 * affiche : ni produits ni ventes.
 */
@Controller('live')
export class OnAirController {
  constructor(private readonly livesService: LivesService) {}

  // Le service garde deja la valeur 15 s en memoire ; ce cache navigateur
  // evite en plus l'aller-retour vers le serveur a chaque relecture.
  @Get('current')
  @Header('Cache-Control', 'public, max-age=15')
  async getCurrent() {
    return { live: await this.livesService.findOnAir() };
  }
}
