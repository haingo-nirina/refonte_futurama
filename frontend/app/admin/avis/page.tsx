import Link from "next/link";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ModerationStatusBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/admin/page-header";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { getAdminReviews } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";
import { formatDateTime } from "@/lib/format";
import { MODERATION_STATUSES, type ModerationStatus } from "@/lib/types";

export const metadata = { title: "Avis" };

const PAGE_SIZE = 20;

function readParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AdminReviewsPage({
  searchParams,
}: PageProps<"/admin/avis">) {
  const params = await searchParams;

  const rawStatus = readParam(params.status);
  const status = MODERATION_STATUSES.some((entry) => entry.value === rawStatus)
    ? (rawStatus as ModerationStatus)
    : undefined;
  const productId = readParam(params.productId);
  const page = Math.max(1, Number.parseInt(readParam(params.page), 10) || 1);

  const { data, meta } = await getAdminReviews(
    {
      page,
      limit: PAGE_SIZE,
      status,
      productId: productId || undefined,
    },
    await getServerToken(),
  );

  const tabs = [
    { value: "", label: "Tous" },
    ...MODERATION_STATUSES.map((entry) => ({
      value: entry.value as string,
      label: entry.label,
    })),
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Avis"
        subtitle={`${meta.total} avis · les avis ne sont visibles sur la boutique qu'une fois approuves`}
      />

      <nav className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = (status ?? "") === tab.value;
          const search = new URLSearchParams();
          if (tab.value) search.set("status", tab.value);
          if (productId) search.set("productId", productId);
          const suffix = search.toString();

          return (
            <Link
              key={tab.value || "all"}
              href={`/admin/avis${suffix ? `?${suffix}` : ""}`}
              className={`rounded-[9px] px-3 py-2 text-[13px] font-bold transition ${
                active
                  ? "bg-navy text-white"
                  : "border-line-strong text-ink hover:border-brand hover:text-brand border bg-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}

        {productId ? (
          <Link
            href="/admin/avis"
            className="text-muted hover:text-brand ml-auto self-center text-[12.5px]"
          >
            Retirer le filtre produit ×
          </Link>
        ) : null}
      </nav>

      {data.length === 0 ? (
        <p className="border-line text-muted rounded-[14px] border bg-white p-8 text-center text-sm">
          Aucun avis dans cette file.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((review) => (
            <li key={review.id} className="admin-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-display text-navy font-extrabold">
                      {review.rating}/5
                    </span>
                    <ModerationStatusBadge status={review.moderationStatus} />
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
                </div>

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
