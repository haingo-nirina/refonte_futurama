import { isPlayableVideo } from "@/lib/video";

/**
 * La video de demonstration deposee depuis le backoffice (`Product.videoUrl`).
 * Rendue en Server Component : `<video controls>` est natif, rien ici n'a
 * besoin d'etat.
 *
 * Un lien externe qu'aucun lecteur natif ne sait jouer n'est pas escamote — il
 * a ete saisi pour etre vu : la section retombe alors sur un lien sortant.
 */
export function ProductVideo({ url, name }: { url: string; name: string }) {
  return (
    <section className="border-line mt-14 border-t pt-10">
      <span className="text-brand font-mono text-[10.5px] tracking-[0.18em]">
        EN VIDEO
      </span>
      <h2 className="font-display text-navy mt-2 mb-5 text-[28px] leading-tight font-extrabold tracking-tight">
        Decouvrez le {name} en fonctionnement
      </h2>

      {isPlayableVideo(url) ? (
        <div className="max-w-[760px] overflow-hidden rounded-[16px] bg-black shadow-[0_20px_50px_-30px_rgba(20,20,40,0.4)]">
          <video
            src={url}
            controls
            // La video n'est pas le contenu principal de la fiche : on ne
            // telecharge que de quoi afficher la premiere image.
            preload="metadata"
            className="block aspect-video w-full bg-[#0b0f1a]"
          >
            Votre navigateur ne supporte pas la video.
          </video>
        </div>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand text-[13.5px] font-bold hover:underline"
        >
          Voir la video →
        </a>
      )}
    </section>
  );
}
