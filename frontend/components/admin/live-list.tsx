"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { LiveControls } from "@/components/admin/live-controls";
import { LiveStatusBadge } from "@/components/admin/status-badge";
import { ReplayVisibility } from "@/components/admin/replay-visibility";
import { ApiError } from "@/lib/api";
import { deleteLive } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { formatLiveDate } from "@/lib/live";
import type { AdminLive } from "@/lib/types";

/**
 * Des cartes plutot qu'un tableau : pendant le direct, la vendeuse pilote
 * depuis son telephone, et un tableau defilerait a l'horizontale.
 *
 * Un clic sur la carte ouvre la regie (`/admin/lives/:id/direct` : video,
 * commentaires, produits) ; « Modifier » reste le formulaire.
 */
export function LiveList({ lives }: { lives: AdminLive[] }) {
  const router = useRouter();

  const [deleting, setDeleting] = useState<AdminLive | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!deleting) return;

    setPending(true);
    setError(null);
    try {
      await deleteLive(deleting.id);
      setDeleting(null);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof ApiError
          ? deleteError.message
          : "Suppression impossible",
      );
    } finally {
      setPending(false);
    }
  }

  if (lives.length === 0) {
    return (
      <p className="admin-card text-muted text-center text-[13.5px]">
        Aucun live pour l&apos;instant. Programmez le premier : titre, date et
        produits présentés.
      </p>
    );
  }

  return (
    <>
      <ul className="grid gap-4 xl:grid-cols-2">
        {lives.map((live) => (
          <li
            key={live.id}
            className={`admin-card hover:border-navy/40 relative flex flex-col gap-4 transition ${
              live.status === "EN_DIRECT" ? "border-brand border-2" : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <LiveStatusBadge status={live.status} />
                {live.status === "TERMINE" && !live.replayVisible ? (
                  <span className="bg-line text-muted rounded-full px-2.5 py-1 text-[11.5px] font-bold">
                    Masqué des replays
                  </span>
                ) : null}
              </div>
              <span className="text-muted text-[12.5px] first-letter:uppercase">
                {formatLiveDate(live.scheduledAt)}
              </span>
            </div>

            <div>
              <h2 className="font-display text-navy text-[17px] font-extrabold">
                {/* Lien etire sur toute la carte : un clic n'importe ou ouvre
                    la regie. Les actions passent au-dessus (`z-10`). */}
                <Link
                  href={`/admin/lives/${live.id}/direct`}
                  className="after:absolute after:inset-0 after:rounded-[inherit] hover:underline"
                >
                  {live.title}
                </Link>
              </h2>
              {live.description ? (
                <p className="text-muted mt-1 line-clamp-2 text-[13px]">
                  {live.description}
                </p>
              ) : null}
            </div>

            <div className="bg-cream-deep grid grid-cols-2 gap-2 rounded-[10px] p-3 text-center">
              <Stat label="Produits" value={String(live._count.products)} />
              <Stat
                label="Ventes"
                value={`${live.sales.orders} cmd`}
                detail={formatPrice(live.sales.revenue)}
              />
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3">
              <LiveControls live={live} />
              <Link
                href={`/admin/lives/${live.id}`}
                className="admin-button-ghost"
              >
                Modifier
              </Link>
              {live.status === "EN_DIRECT" ? (
                <Link
                  href="/live"
                  target="_blank"
                  className="text-navy hover:text-brand text-[12.5px] font-bold"
                >
                  Voir la page ↗
                </Link>
              ) : null}
              {live.status === "TERMINE" && live.facebookUrl ? (
                <>
                  {live.replayVisible ? (
                    <Link
                      href={`/videos/${live.id}`}
                      target="_blank"
                      className="text-navy hover:text-brand text-[12.5px] font-bold"
                    >
                      Voir le replay ↗
                    </Link>
                  ) : null}
                  <ReplayVisibility live={live} variant="button" />
                </>
              ) : null}
              {/* Un live qui a vendu ne se supprime pas : le backend
                  repondrait 409, sa mesure des ventes disparaitrait. */}
              {live.sales.orders === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDeleting(live);
                  }}
                  className="text-brand ml-auto text-[12.5px] font-bold hover:underline"
                >
                  Supprimer
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer le live"
        message={
          <>
            Supprimer « <strong>{deleting?.title}</strong> » ?
          </>
        }
        detail="Sa sélection de produits part avec lui. Les produits eux-mêmes ne sont pas touchés."
        pending={pending}
        error={error}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <span className="text-muted block text-[11px] font-semibold">
        {label}
      </span>
      <span className="font-display text-navy block text-[15px] font-extrabold">
        {value}
      </span>
      {detail ? (
        <span className="text-muted block text-[11px] font-semibold">
          {detail}
        </span>
      ) : null}
    </div>
  );
}
