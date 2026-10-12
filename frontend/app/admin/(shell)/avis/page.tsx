import Link from "next/link";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PageHeader } from "@/components/admin/page-header";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { ModerationBadge } from "@/components/admin/status-badge";
import { getAdminReviews } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";
import { formatDateTime } from "@/lib/format";
import { MODERATION_STATUSES, type ModerationStatus } from "@/lib/types";

export const metadata = { title: "Avis" };

const PAGE_SIZE = 20;

function readParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** `all` n'est pas un statut : c'est l'absence de filtre, rendue explicite. */
const ALL = "all";

/**
 * Onglets de statut : « En attente » par defaut, c'est la file a traiter.
 * Ils vivent dans l'URL comme les autres filtres du backoffice.
 */
const TABS = [
  ...MODERATION_STATUSES,
  { value: ALL, label: "Tous" },
] as const;

function readStatus(value: string): ModerationStatus | typeof ALL {
  if (value === ALL) return ALL;
  return (
    MODERATION_STATUSES.find((entry) => entry.value === value)?.value ??
    "pending"
  );
}

/**
 * Un avis depose arrive en attente : il n'apparait sur la fiche produit
 * qu'une fois valide ici. Le filtre par produit vient du lien pose sur la
 * fiche produit du backoffice.
 */
export default async function AdminReviewsPage({
  searchParams,
}: PageProps<"/admin/avis">) {
  const params = await searchParams;

  const productId = readParam(params.productId);
  const status = readStatus(readParam(params.status));
  const page = Math.max(1, Number.parseInt(readParam(params.page), 10) || 1);

  const { data, meta } = await getAdminReviews(
    {
      page,
      limit: PAGE_SIZE,
      status: status === ALL ? undefined : status,
      productId: productId || undefined,
    },
    await getServerToken(),
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Avis"
        subtitle={`${meta.total} avis · un avis n'est publie sur la fiche produit qu'apres validation`}
      />

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Statut des avis">
        {TABS.map((tab) => {
          const query = new URLSearchParams({ status: tab.value });
          if (productId) query.set("productId", productId);
          const active = tab.value === status;

          return (
            <Link
              key={tab.value}
              href={`/admin/avis?${query}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                active
                  ? "bg-navy text-white"
                  : "border-line text-muted hover:text-ink border bg-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {productId ? (
        <p className="mb-6">
          <Link
            href={`/admin/avis?status=${status}`}
            className="text-muted hover:text-brand text-[12.5px]"
          >
            Retirer le filtre produit ×
          </Link>
        </p>
      ) : null}

      {data.length === 0 ? (
        <p className="border-line text-muted rounded-[14px] border bg-white p-8 text-center text-sm">
          {status === "pending"
            ? "Aucun avis en attente de validation."
            : "Aucun avis pour le moment."}
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((review) => (
            <li key={review.id} className="admin-card">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-display text-navy font-extrabold">
                  {review.rating}/5
                </span>
                <ModerationBadge status={review.moderationStatus} />
              </div>

              <p className="text-[13.5px]">
                <Link
                  href={`/admin/produits/${review.product.id}`}
                  className="hover:text-brand font-semibold"
                >
                  {review.product.name}
                </Link>
              </p>
              <p className="text-muted text-[12px]">
                {review.user.fullName} · {formatDateTime(review.createdAt)}
              </p>

              {review.comment ? (
                <p className="text-ink mt-2 text-[13.5px] whitespace-pre-line">
                  {review.comment}
                </p>
              ) : (
                <p className="text-muted-light mt-2 text-[13px]">
                  Note sans commentaire.
                </p>
              )}

              <div className="mt-4">
                <ReviewModeration
                  reviewId={review.id}
                  status={review.moderationStatus}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminPagination
        basePath="/admin/avis"
        page={meta.page}
        totalPages={meta.totalPages}
        params={{ status, productId }}
      />
    </div>
  );
}
