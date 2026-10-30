import { facebookEmbedUrl } from "@/lib/live";

/**
 * Lecteur video officiel de Facebook dans un `<iframe>` : la video ne passe
 * jamais par nos serveurs. Le meme lien sert pendant le direct et en replay.
 *
 * Le lien « Ouvrir sur Facebook » reste sous le cadre : si la video n'est pas
 * publique, ou si le navigateur bloque les contenus tiers, le cadre reste vide
 * et c'est la seule issue.
 */
export function FacebookVideo({ url, title }: { url: string; title: string }) {
  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-[14px] bg-black">
        <iframe
          src={facebookEmbedUrl(url)}
          title={title}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted hover:text-brand mt-2 inline-block text-[12px] font-medium"
      >
        La vidéo ne s&apos;affiche pas ? Ouvrir sur Facebook ↗
      </a>
    </div>
  );
}
