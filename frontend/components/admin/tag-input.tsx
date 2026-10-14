"use client";

import { useState, type KeyboardEvent } from "react";

/**
 * Saisie d'une liste de textes courts en etiquettes : Entree ou virgule ajoute
 * la valeur, la croix la retire, Retour arriere sur un champ vide retire la
 * derniere. Les doublons (casse ignoree) sont ecartes.
 *
 * Le texte encore en cours de frappe n'appartient pas a la liste : il est
 * ajoute en quittant le champ, pour ne pas perdre une couleur tapee sans
 * Entree avant d'enregistrer.
 */
export function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    setDraft("");
    if (!value) return;
    const exists = values.some(
      (item) => item.toLowerCase() === value.toLowerCase(),
    );
    if (!exists) onChange([...values, value]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      // Entree soumettrait le formulaire produit entier.
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="admin-input flex h-auto min-h-[42px] flex-wrap items-center gap-1.5 py-1.5 focus-within:border-brand">
      {values.map((value) => (
        <span
          key={value}
          className="bg-cream-deep text-ink inline-flex items-center gap-1 rounded-md py-0.5 pr-1 pl-2 text-[12.5px] font-medium"
        >
          {value}
          <button
            type="button"
            onClick={() => onChange(values.filter((item) => item !== value))}
            aria-label={`Retirer ${value}`}
            className="text-muted hover:text-brand px-1 leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={values.length === 0 ? placeholder : undefined}
        className="min-w-[100px] flex-1 bg-transparent outline-none"
      />
    </div>
  );
}
