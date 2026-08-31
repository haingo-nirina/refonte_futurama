"use client";

import { useId, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  ACCEPTED_VIDEO_TYPES,
  MAX_VIDEO_BYTES,
  uploadVideo,
} from "@/lib/admin-api";

/** Extensions qu'un `<video>` sait lire : le reste n'a pas d'apercu. */
const PLAYABLE = /\.(mp4|webm|mov)(\?.*)?$/i;

/**
 * Video de demonstration d'un produit : soit televersee depuis le poste de
 * l'administrateur, soit hebergee ailleurs et collee en URL. Les deux
 * aboutissent a la meme chaine, celle de `Product.videoUrl`.
 *
 * Comme `ImageUpload`, le fichier part des sa selection plutot qu'a la
 * validation du formulaire : le champ ne manipule ensuite qu'une URL, et une
 * video lourde ne retarde pas l'enregistrement du produit.
 */
export function VideoUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;

    setError(null);

    // Controle de confort : le backend revalide type et taille. Il evite
    // surtout d'envoyer 300 Mo pour rien.
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setError("Formats acceptes : MP4, WebM ou MOV.");
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      setError(
        `Fichier trop lourd (${Math.round(file.size / 1024 / 1024)} Mo). Maximum 50 Mo.`,
      );
      return;
    }

    setPending(true);

    try {
      const { url } = await uploadVideo(file);
      onChange(url);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Televersement impossible",
      );
    } finally {
      setPending(false);
      // Reselectionner le meme fichier apres une erreur doit redeclencher
      // `change`, ce que le champ ne fait pas si sa valeur n'a pas bouge.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES.join(",")}
        onChange={(event) => void onPick(event.target.files?.[0])}
        className="hidden"
      />

      {value && PLAYABLE.test(value) ? (
        <video
          // `key` : sans lui, React garde l'element et la video precedente
          // reste chargee apres un remplacement.
          key={value}
          src={value}
          controls
          preload="metadata"
          className="border-line mb-3 max-h-[220px] w-full rounded-[12px] border bg-black"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="admin-button-ghost"
        >
          {pending
            ? "Televersement…"
            : value
              ? "Remplacer la video"
              : "Choisir une video"}
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setError(null);
            }}
            disabled={pending}
            className="text-muted hover:text-brand px-2 text-[13px] font-bold disabled:opacity-50"
          >
            Retirer
          </button>
        ) : null}
      </div>

      {error ? <p className="text-brand mt-2 text-[12.5px]">{error}</p> : null}

      <label className="mt-3 block">
        <span className="text-muted-light text-[12px]">
          …ou coller le lien d&apos;une video hebergee ailleurs
        </span>
        <input
          type="text"
          inputMode="url"
          placeholder="https://…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="admin-input"
        />
      </label>

      <p className="text-muted-light mt-1 text-[12px]">
        MP4, WebM ou MOV — 50 Mo maximum.
      </p>
    </div>
  );
}
