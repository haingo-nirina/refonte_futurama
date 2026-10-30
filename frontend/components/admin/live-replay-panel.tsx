"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReplayVisibility } from "@/components/admin/replay-visibility";
import { ApiError } from "@/lib/api";
import { updateLive } from "@/lib/admin-api";

/**
 * Fiche d'un live termine : son replay. Le lien se corrige comme il s'est
 * saisi au lancement (code d'integration ou lien de la video) ; les produits,
 * eux, restent dans le formulaire du live, modifiable apres la fin.
 */
export function LiveReplayPanel({
  live,
}: {
  live: {
    id: string;
    title: string;
    facebookUrl: string | null;
    replayVisible: boolean;
  };
}) {
  const router = useRouter();

  const [url, setUrl] = useState(live.facebookUrl ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateLive(live.id, { facebookUrl: url.trim() });
      // le backend a pu extraire le lien d'un code d'integration
      setUrl(updated.facebookUrl ?? "");
      setSaved(true);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof ApiError
          ? saveError.message
          : "Enregistrement impossible",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-card mb-6 grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-navy text-[16px] font-extrabold">
          Replay
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <ReplayVisibility live={live} variant="switch" />
          {live.replayVisible && live.facebookUrl ? (
            <Link
              href={`/videos/${live.id}`}
              target="_blank"
              className="text-navy hover:text-brand text-[12.5px] font-bold"
            >
              Voir le replay ↗
            </Link>
          ) : null}
        </div>
      </div>

      {!live.facebookUrl ? (
        <p className="text-muted text-[13px]">
          Ce live n&apos;a pas de vidéo : renseignez son lien pour qu&apos;il
          apparaisse dans les replays.
        </p>
      ) : null}

      <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3">
        <label className="block">
          <span className="admin-label">
            Lien de la vidéo Facebook (ou code d&apos;intégration)
          </span>
          {/* pas de type="url" : le code d'integration est du HTML, le
              backend en extrait le lien */}
          <textarea
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setSaved(false);
            }}
            rows={2}
            className="admin-input font-mono text-[12px]"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {error ? <p className="text-brand text-[13px]">{error}</p> : null}
          {saved ? (
            <p className="text-success text-[13px]">Lien enregistré.</p>
          ) : null}
          <button
            type="submit"
            disabled={pending || url.trim() === (live.facebookUrl ?? "")}
            className="admin-button"
          >
            {pending ? "Envoi…" : "Enregistrer le lien"}
          </button>
        </div>
      </form>
    </section>
  );
}
