/**
 * Utilitaires du live shopping, partages par le backoffice et la page /live.
 * Pas de `"use client"` : les Server Components s'en servent aussi.
 */

/**
 * Adresse du lecteur video officiel de Facebook (« Embedded Video Player »),
 * a poser dans un `<iframe>`. Aucune cle ni SDK : la video doit simplement
 * etre publique. Le meme lien sert pendant le direct et pour le replay : celui
 * que la vendeuse a colle en lancant le live.
 */
export function facebookEmbedUrl(videoUrl: string): string {
  const params = new URLSearchParams({
    href: videoUrl,
    show_text: "false",
    width: "1280",
  });

  return `https://www.facebook.com/plugins/video.php?${params}`;
}

/**
 * Les lives sont annonces a l'heure de Madagascar, quel que soit le fuseau du
 * serveur qui rend la page ou du navigateur de la vendeuse. UTC+3 toute
 * l'annee (pas d'heure d'ete), d'ou un decalage fixe pour le champ de saisie.
 */
export const LIVE_TIME_ZONE = "Indian/Antananarivo";
const MADAGASCAR_OFFSET = "+03:00";
const MADAGASCAR_OFFSET_MS = 3 * 60 * 60 * 1000;

/** `jeudi 30 octobre à 15:00` */
export function formatLiveDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: LIVE_TIME_ZONE,
  });
}

/** `2026-10-30T15:00`, heure de Madagascar : format d'un `datetime-local`. */
export function toLiveInputValue(iso: string): string {
  return new Date(new Date(iso).getTime() + MADAGASCAR_OFFSET_MS)
    .toISOString()
    .slice(0, 16);
}

/** Inverse de `toLiveInputValue` : la saisie est lue en heure de Madagascar. */
export function fromLiveInputValue(value: string): string {
  return new Date(`${value}:00${MADAGASCAR_OFFSET}`).toISOString();
}
