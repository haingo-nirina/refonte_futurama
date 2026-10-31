"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  commentLive,
  deleteLiveComment,
  getLiveComments,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRelativeDate } from "@/lib/format";
import type { LiveComment, LiveStatus } from "@/lib/types";

/** Pendant le direct, le fil doit bouger presque comme sur Facebook. */
const LIVE_POLL_MS = 5_000;
/** En replay ou avant le live, les commentaires arrivent au compte-gouttes. */
const IDLE_POLL_MS = 30_000;

/** Aligne sur `LIVE_COMMENT_MAX_LENGTH` cote backend. */
const MAX_LENGTH = 500;

/**
 * Le fil de commentaires public de la page live, en direct comme en replay.
 *
 * Tout est charge cote client, apres l'hydratation : le fil change toutes les
 * quelques secondes, le rendre cote serveur ne servirait qu'au premier
 * affichage — et les dates relatives differeraient de celles du HTML serveur.
 *
 * La relecture se met en pause quand l'onglet est cache : inutile de solliciter
 * la base pour un fil que personne ne regarde.
 *
 * Le backoffice reutilise le meme fil dans la regie du live : connecte en
 * admin, on y publie sous son nom, badge « Futurama », et on peut tout
 * supprimer.
 * `loginPath` y pointe vers sa propre connexion.
 */
export function LiveComments({
  liveId,
  status,
  loginPath = "/connexion",
  listClassName = "max-h-[360px] min-h-[120px]",
}: {
  liveId: string;
  status: LiveStatus;
  loginPath?: string;
  /** Hauteur du fil : la regie du backoffice lui donne plus de place. */
  listClassName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [comments, setComments] = useState<LiveComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLUListElement>(null);
  // Ne ramener le fil en bas que si le lecteur y etait deja : sinon un nouveau
  // commentaire l'arracherait a ce qu'il est en train de relire.
  const stickToBottom = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const interval = status === "EN_DIRECT" ? LIVE_POLL_MS : IDLE_POLL_MS;

    async function refresh() {
      if (document.hidden) return;
      try {
        const { data } = await getLiveComments(liveId);
        if (!cancelled) setComments(data);
      } catch {
        // API injoignable : on garde le fil deja affiche, le prochain tour
        // reessaiera.
        if (!cancelled) setComments((current) => current ?? []);
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, interval);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [liveId, status]);

  useEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [comments]);

  function onScroll() {
    const list = listRef.current;
    if (!list) return;
    stickToBottom.current =
      list.scrollHeight - list.scrollTop - list.clientHeight < 40;
  }

  function fail(cause: unknown, fallback: string) {
    // Token expire pendant que la page etait ouverte.
    if (cause instanceof ApiError && cause.status === 401) {
      router.push(`${loginPath}?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setError(cause instanceof ApiError ? cause.message : fallback);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const message = draft.trim();
    if (!message || pending) return;

    setPending(true);
    setError(null);

    try {
      const created = await commentLive(liveId, message);
      setDraft("");
      stickToBottom.current = true;
      setComments((current) => [...(current ?? []), created]);
    } catch (cause) {
      fail(cause, "Envoi impossible, réessayez.");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(commentId: string) {
    setError(null);

    try {
      await deleteLiveComment(liveId, commentId);
      setComments((current) =>
        (current ?? []).filter((comment) => comment.id !== commentId),
      );
    } catch (cause) {
      fail(cause, "Suppression impossible.");
    }
  }

  return (
    <section className="border-line flex flex-col rounded-[14px] border bg-white">
      <h2 className="font-display text-navy border-line border-b px-4 py-3 text-[16px] font-extrabold">
        Commentaires
        {comments?.length ? (
          <span className="text-muted text-[13px] font-medium">
            {" "}
            · {comments.length}
          </span>
        ) : null}
      </h2>

      <ul
        ref={listRef}
        onScroll={onScroll}
        className={`flex flex-col gap-3 overflow-y-auto px-4 py-3 ${listClassName}`}
        aria-live="polite"
      >
        {comments === null ? (
          <li className="text-muted m-auto text-[13px]">Chargement…</li>
        ) : comments.length === 0 ? (
          <li className="text-muted m-auto text-center text-[13px]">
            Soyez le premier à commenter.
          </li>
        ) : (
          comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              canDelete={
                !!user && (user.id === comment.user.id || user.role === "admin")
              }
              onDelete={onDelete}
            />
          ))
        )}
      </ul>

      <div className="border-line border-t px-4 py-3">
        {user === undefined ? null : user === null ? (
          <p className="text-muted text-[13px]">
            <Link
              href={`${loginPath}?next=${encodeURIComponent(pathname)}`}
              className="text-navy font-bold underline"
            >
              Connectez-vous
            </Link>{" "}
            pour commenter.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="Écrire un commentaire…"
              aria-label="Votre commentaire"
              className="border-line min-w-0 flex-1 rounded-full border bg-white px-4 py-2.5 text-[14px] outline-none focus:border-navy"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="bg-navy font-display shrink-0 rounded-full px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {pending ? "…" : "Publier"}
            </button>
          </form>
        )}
        {error ? (
          <p role="alert" className="text-brand mt-2 text-[12.5px]">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Chaque commentaire porte le nom du compte qui l'a ecrit, equipe comprise :
 * pendant un live, on repond en son nom. Un compte de la boutique ajoute le
 * badge « Futurama » (et un avatar rouge) pour qu'on reconnaisse l'equipe.
 */
function CommentRow({
  comment,
  canDelete,
  onDelete,
}: {
  comment: LiveComment;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const author = comment.user.fullName;

  return (
    <li className="flex gap-2.5">
      <span
        aria-hidden
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${
          comment.fromShop ? "bg-brand" : "bg-navy"
        }`}
      >
        {author.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <div className="bg-line/60 rounded-[14px] px-3 py-2">
          <p className="text-navy flex items-center gap-1.5 text-[13px] font-bold">
            {author}
            {comment.fromShop ? (
              <span className="bg-brand rounded-full px-1.5 py-px text-[10px] font-bold tracking-wide text-white uppercase">
                Futurama
              </span>
            ) : null}
          </p>
          <p className="text-[14px] break-words whitespace-pre-line">
            {comment.message}
          </p>
        </div>
        <div className="text-muted mt-1 flex gap-3 px-1 text-[11.5px]">
          <span>{formatRelativeDate(comment.createdAt)}</span>
          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="font-bold hover:underline"
            >
              Supprimer
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
