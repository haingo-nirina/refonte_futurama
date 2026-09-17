"use client";

import { useState } from "react";

/**
 * Bulle « Assistant IA Futurama » de la maquette (bloc ASSISTANT IA de
 * `maquette/refonte-site-Futurama-v1.3.html`).
 *
 * Integration visuelle uniquement : le panneau s'ouvre et se ferme, mais rien
 * n'est envoye nulle part. Le fil affiche le seul message d'accueil de la
 * maquette, et « Envoyer » ne declenche aucun appel — il n'y a pas encore de
 * route d'assistant cote backend.
 */
export function AiAssistant() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="bg-brand hover:bg-brand-dark font-display fixed right-6 bottom-6 z-[600] flex items-center gap-2.5 rounded-full px-5 py-3.5 text-[13.5px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(20,20,40,0.55)] transition"
      >
        <span className="text-[17px]" aria-hidden>
          💬
        </span>
        <span>Assistant IA Futurama</span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Assistant Futurama"
      className="fixed right-6 bottom-6 z-[601] flex h-[500px] max-h-[calc(100vh-48px)] w-[368px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_30px_70px_-30px_rgba(20,20,40,0.55)]"
    >
      <div className="bg-navy-deep flex flex-none items-center justify-between px-[18px] py-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[14.5px] font-bold text-white">
            Assistant Futurama
          </span>
          <span className="text-[11.5px] text-white/60">
            Jouets · Électroménager · Énergie
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer l'assistant"
          className="text-[17px] leading-none text-white/80 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="bg-cream-deep flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
        <div className="text-ink max-w-[82%] self-start rounded-[12px] bg-white px-[13px] py-2.5 text-[13.5px] leading-[1.48]">
          Bonjour ! Je suis l&apos;assistant Futurama 👋 Je peux vous aider à
          trouver un produit, connaître nos horaires, la livraison ou le stock.
          Que recherchez-vous ?
        </div>
      </div>

      <form
        onSubmit={(event) => event.preventDefault()}
        className="border-line flex flex-none gap-2 border-t bg-white p-3"
      >
        <input
          aria-label="Votre question"
          placeholder="Posez votre question…"
          className="border-line-strong focus:border-brand min-w-0 flex-1 rounded-[9px] border-[1.5px] px-3 py-2.5 text-[13px] outline-none"
        />
        <button
          type="submit"
          className="bg-brand hover:bg-brand-dark font-display rounded-[9px] px-4 text-[13px] font-bold text-white transition"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
