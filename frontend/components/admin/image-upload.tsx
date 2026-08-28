"use client";

import { useId, useRef, useState } from "react";
import { ProductImage } from "@/components/product-image";
import { ApiError } from "@/lib/api";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  uploadImage,
  type UploadKind,
} from "@/lib/admin-api";

/**
 * Choix d'un fichier local, televersement immediat, puis remontee de l'URL au
 * parent. Le fichier part des sa selection plutot qu'a la validation du
 * formulaire : l'URL obtenue est ce que le formulaire manipule ensuite, et une
 * photo lourde n'a pas a retarder l'enregistrement du produit.
 *
 * La taille et le type sont verifies ici *et* cote backend. Le controle client
 * n'est qu'un confort — il evite d'envoyer 20 Mo pour rien.
 */
export function ImageUpload({
  value,
  onChange,
  alt = "",
  kind = "products",
  compact = false,
}: {
  value: string;
  onChange: (url: string) => void;
  alt?: string;
  /** Sous-dossier de rangement cote serveur. */
  kind?: UploadKind;
  /** Vignette seule, pour une ligne de galerie deja dense. */
  compact?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;

    setError(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Formats acceptes : JPEG, PNG, WebP, AVIF.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError(
        `Fichier trop lourd (${Math.round(file.size / 1024 / 1024)} Mo). Maximum 5 Mo.`,
      );
      return;
    }

    setPending(true);

    try {
      const { url } = await uploadImage(file, kind);
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

  const input = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(",")}
      onChange={(event) => void onPick(event.target.files?.[0])}
      className="hidden"
    />
  );

  if (compact) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1">
        {input}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          title={value ? "Remplacer la photo" : "Televerser une photo"}
          className="border-line-strong hover:border-brand size-[52px] shrink-0 overflow-hidden rounded-[10px] border bg-white transition disabled:opacity-50"
        >
          {pending ? (
            <span className="text-muted text-[11px]">…</span>
          ) : (
            <ProductImage src={value || null} alt={alt} className="size-full" />
          )}
        </button>
        {error ? (
          <span className="text-brand max-w-[120px] text-[10.5px] leading-tight">
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {input}

      <div className="flex flex-wrap items-center gap-4">
        <div className="border-line size-[92px] shrink-0 overflow-hidden rounded-[12px] border">
          <ProductImage src={value || null} alt={alt} className="size-full" />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="admin-button-ghost"
          >
            {pending
              ? "Televersement…"
              : value
                ? "Remplacer la photo"
                : "Choisir une photo"}
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
      </div>

      {error ? <p className="text-brand mt-2 text-[12.5px]">{error}</p> : null}
      <p className="text-muted-light mt-2 text-[12px]">
        JPEG, PNG, WebP ou AVIF — 5 Mo maximum.
      </p>
    </div>
  );
}
