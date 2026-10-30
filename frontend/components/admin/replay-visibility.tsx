"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ApiError } from "@/lib/api";
import { updateLive } from "@/lib/admin-api";

/**
 * Visibilite d'un replay dans « Nos vidéos ». Le retirer demande confirmation
 * (la video disparait du site), le remettre non. Interrupteur sur la fiche du
 * live, bouton sur sa carte dans la liste.
 *
 * La nouvelle valeur s'affiche des la reponse du backend, et le controle reste
 * en attente jusqu'a la fin de la relecture de la page (quelques secondes vers
 * Aiven) : sans ca, il garde son ancien etat le temps du rechargement et
 * invite a cliquer une seconde fois.
 */
export function ReplayVisibility({
  live,
  variant,
}: {
  live: { id: string; title: string; replayVisible: boolean };
  variant: "switch" | "button";
}) {
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [visible, setVisible] = useState(live.replayVisible);
  // la page relue fait foi : on s'y realigne quand elle change
  const [shown, setShown] = useState(live.replayVisible);
  if (live.replayVisible !== shown) {
    setShown(live.replayVisible);
    setVisible(live.replayVisible);
  }

  const busy = pending || refreshing;

  async function save(replayVisible: boolean) {
    setPending(true);
    setError(null);
    try {
      await updateLive(live.id, { replayVisible });
      setVisible(replayVisible);
      setConfirming(false);
      startRefresh(() => router.refresh());
    } catch (saveError) {
      setError(
        saveError instanceof ApiError
          ? saveError.message
          : "Modification impossible",
      );
    } finally {
      setPending(false);
    }
  }

  function onChange() {
    setError(null);
    if (visible) setConfirming(true);
    else void save(true);
  }

  return (
    <>
      {variant === "switch" ? (
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            role="switch"
            checked={visible}
            onChange={onChange}
            disabled={busy}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={`relative h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 ${
              visible ? "bg-brand" : "bg-line-strong"
            } ${busy ? "opacity-60" : ""}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition ${
                visible ? "translate-x-5" : ""
              }`}
            />
          </span>
          <span className="text-ink text-[13.5px] font-semibold">
            Visible dans les replays
          </span>
        </label>
      ) : (
        <button
          type="button"
          onClick={onChange}
          disabled={busy}
          className="text-navy hover:text-brand text-[12.5px] font-bold disabled:opacity-60"
        >
          {busy
            ? "Mise à jour…"
            : visible
              ? "Retirer des replays"
              : "Remettre dans les replays"}
        </button>
      )}

      {/* l'erreur d'une remise en ligne, qui ne passe pas par la confirmation */}
      {error && !confirming ? (
        <p className="text-brand text-[12.5px]">{error}</p>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title="Retirer des replays"
        message={
          <>
            Retirer « <strong>{live.title}</strong> » des replays ?
          </>
        }
        detail="La vidéo disparaît de « Nos vidéos » et de la page /live. Le live, ses produits et ses ventes sont conservés : vous pourrez la remettre à tout moment."
        confirmLabel="Retirer"
        pendingLabel="Retrait…"
        pending={pending}
        error={error}
        onConfirm={() => void save(false)}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
