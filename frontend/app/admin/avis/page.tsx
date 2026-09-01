import Link from "next/link";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PageHeader } from "@/components/admin/page-header";
import { getAdminReviews } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Avis" };

const PAGE_SIZE = 20;

function readParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Consultation seule : les avis sont publies directement sur la boutique, le
 * backoffice n'a pas d'action a proposer dessus. Seul le filtre par produit
 * subsiste, il vient du lien pose sur la fiche produit.
 */
export default async function AdminReviewsPage({
  searchParams,
}: PageProps<"/admin/avis">) {
  const params = await searchParams;

  const productId = readParam(params.productId);
  const page = Math.max(1, Number.parseInt(readParam(params.page), 10) || 1);

  const { data, meta } = await getAdminReviews(
    { page, limit: PAGE_SIZE, productId: productId || undefined },
    await getServerToken(),
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Avis"
        subtitle={`${meta.total} avis · deposes par les clients depuis les fiches produit`}
      />

      {productId ? (
        <p className="mb-6">
          <Link
            href="/admin/avis"
            className="text-muted hover:text-brand text-[12.5px]"
          >
            Retirer le filtre produit ×
          </Link>
        </p>
      ) : null}

      {data.length === 0 ? (
        <p className="border-line text-muted rounded-[14px] border bg-white p-8 text-center text-sm">
          Aucun avis pour le moment.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((review) => (
            <li key={review.id} className="admin-card">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-display text-navy font-extrabold">
                  {review.rating}/5
                </span>
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
            </li>
          ))}
        </ul>
      )}

      <AdminPagination
        basePath="/admin/avis"
        page={meta.page}
        totalPages={meta.totalPages}
        params={{ productId }}
      />
    </div>
  );
}
