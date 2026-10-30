"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Modal } from "@/components/admin/modal";
import { ApiError } from "@/lib/api";
import { endLive, startLive } from "@/lib/admin-api";
import type { LiveStatus } from "@/lib/types";

/**
 * Le direct se pilote a la main : la vendeuse lance la diffusion sur la Page
 * Facebook, copie le lien de la video et le colle ici. Le site affiche alors
 * le lecteur Facebook integre, chez tous les visiteurs en moins de 30 s.
 * « Terminer » le repasse en replay.
 */
export function LiveControls({
  live,
}: {
  live: {
    id: string;
    title: string;
    status: LiveStatus;
    facebookUrl: string | null;
  };
}) {
  const router = useRouter();

  const [starting, setStarting] = useState(false);
  const [url, setUrl] = useState("");
  const [ending, setEnding] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = live.status === "EN_DIRECT";

  function openStart() {
    setError(null);
    setUrl(live.facebookUrl ?? "");
    setStarting(true);
  }

  async function onStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await startLive(live.id, url.trim());
      setStarting(false);
      router.refresh();
    } catch (startError) {
      setError(
        startError instanceof ApiError
          ? startError.message
          : "Lancement impossible",
      );
    } finally {
      setPending(false);
    }
  }

  async function onEnd() {
    setPending(true);
    setError(null);
    try {
      await endLive(live.id);
      setEnding(false);
      router.refresh();
    } catch (endError) {
      setError(
        endError instanceof ApiError ? endError.message : "Arrêt impossible",
      );
    } finally {
      setPending(false);
    }
  }

  if (live.status === "TERMINE") return null;

  return (
    <>
      {isLive ? (
        <>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEnding(true);
            }}
            className="admin-button justify-center"
          >
            Terminer le live
          </button>
          <button
            type="button"
            onClick={openStart}
            className="admin-button-ghost justify-center"
          >
            Changer le lien
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={openStart}
          className="admin-button justify-center"
        >
          🔴 Lancer le live
        </button>
      )}

      <Modal
        open={starting}
        onClose={() => setStarting(false)}
        title={isLive ? "Changer le lien du live" : "Lancer le live"}
        description={live.title}
      >
        <form onSubmit={(event) => void onStart(event)} className="grid gap-4">
          <ol className="text-muted list-decimal space-y-1 pl-5 text-[13px]">
            <li>Lancez le direct sur la page Facebook Futurama.</li>
            <li>
              Sur un ordinateur, ouvrez la <strong>page Futurama</strong> : le
              live y apparaît en publication.
            </li>
            <li>
              Dans le menu <strong>…</strong> de la publication, choisissez{" "}
              <strong>Intégrer à un site</strong> puis{" "}
              <strong>Copier le code</strong>.
            </li>
            <li>Collez tout le code ci-dessous.</li>
          </ol>

          <label className="block">
            <span className="admin-label">
              Code d&apos;intégration ou lien de la vidéo
            </span>
            {/* pas de type="url" : le code d'integration est du HTML, le
                backend en extrait le lien */}
            <textarea
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder='<iframe src="https://www.facebook.com/plugins/video.php?…'
              rows={4}
              className="admin-input font-mono text-[12px]"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>

          {error ? <p className="text-brand text-[13px]">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setStarting(false)}
              className="admin-button-ghost"
            >
              Annuler
            </button>
            <button type="submit" disabled={pending} className="admin-button">
              {pending
                ? "Envoi…"
                : isLive
                  ? "Enregistrer le lien"
                  : "Activer le live"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={ending}
        title="Terminer le live"
        message={
          <>
            Terminer « <strong>{live.title}</strong> » ?
          </>
        }
        detail="Le bandeau « Live en cours » disparaît du site. La page /live affichera le replay, et les produits resteront achetables."
        confirmLabel="Terminer"
        pendingLabel="Arrêt…"
        pending={pending}
        error={error}
        onConfirm={() => void onEnd()}
        onCancel={() => setEnding(false)}
      />
    </>
  );
}
