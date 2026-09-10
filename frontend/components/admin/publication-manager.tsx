"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ImageUpload } from "@/components/admin/image-upload";
import { Modal } from "@/components/admin/modal";
import { ProductImage } from "@/components/product-image";
import { ApiError } from "@/lib/api";
import { createPost, deletePost, updatePost } from "@/lib/admin-api";
import { formatDateTime } from "@/lib/format";
import type { Post, PostInput } from "@/lib/types";

/** `title` -> `slug` : meme regle que la contrainte du DTO backend. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** `2026-09-09T14:05` : ce qu'attend un `<input type="datetime-local">`, en heure locale. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Draft = {
  title: string;
  slug: string;
  content: string;
  photoUrl: string;
  /** Decoche = brouillon : la publication n'apparait pas sur le mur. */
  published: boolean;
  /** Heure locale du champ ; convertie en ISO a l'envoi. */
  publishedAt: string;
};

function emptyDraft(): Draft {
  return {
    title: "",
    slug: "",
    content: "",
    photoUrl: "",
    published: true,
    // Une nouvelle publication part en ligne tout de suite, sauf a decocher.
    publishedAt: toLocalInput(new Date().toISOString()),
  };
}

function toDraft(post: Post): Draft {
  return {
    title: post.title,
    slug: post.slug,
    content: post.content,
    photoUrl: post.photoUrl ?? "",
    published: post.publishedAt !== null,
    publishedAt: toLocalInput(post.publishedAt ?? post.createdAt),
  };
}

/**
 * `null` est significatif ici : il detache la photo et repasse la publication
 * en brouillon. `undefined` laisserait l'ancienne valeur en place.
 */
function toPayload(draft: Draft): PostInput {
  return {
    title: draft.title.trim(),
    slug: draft.slug.trim() || slugify(draft.title),
    content: draft.content.trim(),
    photoUrl: draft.photoUrl.trim() || null,
    publishedAt: draft.published
      ? new Date(draft.publishedAt).toISOString()
      : null,
  };
}

/** Etat lisible, deduit de `publishedAt` : le backend ne stocke pas de statut. */
function state(post: Post): { label: string; tone: string } {
  if (post.publishedAt === null) {
    return { label: "Brouillon", tone: "bg-line text-muted" };
  }

  if (new Date(post.publishedAt).getTime() > Date.now()) {
    return { label: "Programmee", tone: "bg-tint-cool text-tint-cool-ink" };
  }

  return { label: "En ligne", tone: "bg-success-soft text-success" };
}

/** `null` = aucune modale ouverte ; sinon redaction ou reprise d'une publication. */
type Editing = { mode: "create" } | { mode: "edit"; post: Post } | null;

/**
 * Redaction du mur, sur le modele des marques : la liste et le formulaire
 * partagent la page, celui-ci s'ouvrant en modale — la liste ne se decale pas
 * sous les yeux a chaque ouverture.
 */
export function PublicationManager({ posts }: { posts: Post[] }) {
  const router = useRouter();

  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Post | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startCreate() {
    setDraft(emptyDraft());
    setError(null);
    setEditing({ mode: "create" });
  }

  function startEdit(post: Post) {
    setDraft(toDraft(post));
    setError(null);
    setEditing({ mode: "edit", post });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setPending(true);
    setError(null);

    try {
      await (editing.mode === "create"
        ? createPost(toPayload(draft))
        : updatePost(editing.post.id, toPayload(draft)));

      setEditing(null);
      // La page est un Server Component : c'est au serveur de relire.
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Enregistrement impossible",
      );
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!deleting) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      await deletePost(deleting.id);
      setDeleting(null);
      router.refresh();
    } catch (cause) {
      setDeleteError(
        cause instanceof ApiError ? cause.message : "Suppression impossible",
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={startCreate} className="admin-button">
          Nouvelle publication
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="admin-card text-muted text-center text-[13.5px]">
          Aucune publication pour le moment.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => {
            const status = state(post);

            return (
              <li key={post.id} className="admin-card flex items-start gap-4">
                <div className="border-line h-14 w-20 shrink-0 overflow-hidden rounded-[10px] border">
                  <ProductImage
                    src={post.photoUrl}
                    alt={post.title}
                    className="h-full w-full"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold">
                      {post.title}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap ${status.tone}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="text-muted mt-1 line-clamp-2 text-[12.5px]">
                    {post.content}
                  </p>

                  <p className="text-muted-light mt-1.5 text-[12px]">
                    {post.publishedAt
                      ? formatDateTime(post.publishedAt)
                      : `Redigee le ${formatDateTime(post.createdAt)}`}{" "}
                    · {post.likesCount} j&apos;aime · {post._count.comments}{" "}
                    commentaire{post._count.comments > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex shrink-0 gap-3 text-[12.5px] font-bold">
                  {post.publishedAt ? (
                    <Link
                      href="/publications"
                      className="text-muted hover:text-brand"
                    >
                      Voir
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startEdit(post)}
                    className="text-navy hover:text-brand"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleting(post);
                    }}
                    className="text-brand hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => (pending ? undefined : setEditing(null))}
        title={
          editing?.mode === "edit"
            ? `Modifier « ${editing.post.title} »`
            : "Nouvelle publication"
        }
        description="Elle parait sur le mur de la boutique, la plus recente en haut."
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="admin-label">Titre *</span>
            <input
              required
              autoFocus
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                setDraft((current) => ({
                  ...current,
                  title,
                  // Le slug suit le titre tant qu'il n'a pas ete touche a la main.
                  slug:
                    current.slug === slugify(current.title) ||
                    current.slug === ""
                      ? slugify(title)
                      : current.slug,
                }));
              }}
              className="admin-input"
            />
          </label>

          <label className="block">
            <span className="admin-label">Slug *</span>
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              title="minuscules, mots separes par des tirets"
              value={draft.slug}
              onChange={(event) =>
                setDraft({ ...draft, slug: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="admin-label">Texte *</span>
            <textarea
              required
              rows={5}
              value={draft.content}
              onChange={(event) =>
                setDraft({ ...draft, content: event.target.value })
              }
              className="admin-input"
            />
          </label>

          <div className="sm:col-span-2">
            <span className="admin-label">Photo</span>
            <ImageUpload
              value={draft.photoUrl}
              onChange={(url) => setDraft({ ...draft, photoUrl: url })}
              alt={draft.title}
              kind="posts"
            />
          </div>

          <label className="flex items-center gap-2.5 sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(event) =>
                setDraft({ ...draft, published: event.target.checked })
              }
              className="accent-brand size-4"
            />
            <span className="text-[13.5px]">
              Publier sur le mur de la boutique
            </span>
          </label>

          {draft.published ? (
            <label className="block sm:col-span-2">
              <span className="admin-label">Date de publication</span>
              <input
                type="datetime-local"
                required
                value={draft.publishedAt}
                onChange={(event) =>
                  setDraft({ ...draft, publishedAt: event.target.value })
                }
                className="admin-input"
              />
              <span className="text-muted-light mt-1 block text-[12px]">
                Une date a venir programme la parution : la publication reste
                invisible jusque-la.
              </span>
            </label>
          ) : (
            <p className="text-muted bg-cream-deep rounded-[10px] px-3 py-2.5 text-[12.5px] sm:col-span-2">
              Brouillon : visible ici seulement, jamais sur la boutique.
            </p>
          )}

          {error ? (
            <p className="text-brand text-[13px] sm:col-span-2">{error}</p>
          ) : null}

          <div className="mt-1 flex flex-wrap justify-end gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={pending}
              className="admin-button-ghost"
            >
              Annuler
            </button>
            <button type="submit" disabled={pending} className="admin-button">
              {pending
                ? "Enregistrement…"
                : editing?.mode === "edit"
                  ? "Enregistrer"
                  : "Publier"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette publication ?"
        message={
          <>
            <strong>{deleting?.title}</strong> disparaitra du mur de la
            boutique.
          </>
        }
        detail={
          deleting && (deleting._count.comments > 0 || deleting.likesCount > 0)
            ? `Ses ${deleting._count.comments} commentaire(s) et ${deleting.likesCount} « j'aime » sont supprimes avec elle.`
            : "Pour la retirer sans la perdre, repassez-la plutot en brouillon."
        }
        pending={deletePending}
        error={deleteError}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
