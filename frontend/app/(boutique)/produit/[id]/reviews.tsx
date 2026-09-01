import { Pagination } from "@/components/pagination";
import { formatRelativeDate } from "@/lib/format";
import type { ProductReview } from "@/lib/types";
import { ReviewForm } from "./review-form";
import { ReviewItem } from "./review-item";
import { Stars } from "./stars";

/** Avis affiches par page ; le reste attend derriere la pagination. */
const PAGE_SIZE = 5;

/**
 * Moyenne et repartition sont calculees ici : l'API renvoie les avis, pas
 * leurs agregats — et ils tiennent tous dans la reponse de la fiche produit.
 * La pagination se fait donc aussi en memoire, comme le catalogue : la
 * moyenne et les barres portent sur la totalite des avis, pas sur la page.
 */
function summarize(reviews: ProductReview[]) {
  const total = reviews.length;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);

  // De 5 etoiles a 1, comme la maquette.
  const breakdown = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((review) => review.rating === rating).length;

    return { rating, count, pct: total === 0 ? 0 : (count / total) * 100 };
  });

  return { total, average: total === 0 ? 0 : sum / total, breakdown };
}

export function ProductReviews({
  productId,
  reviews,
  page,
}: {
  productId: string;
  reviews: ProductReview[];
  page: number;
}) {
  const { total, average, breakdown } = summarize(reviews);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Une page demandee au-dela de la derniere ne doit pas afficher du vide.
  const current = Math.min(page, totalPages);
  // Le backend renvoie deja les avis du plus recent au plus ancien.
  const shown = reviews.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section id="avis" className="border-line mt-14 border-t pt-10">
      <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <span className="text-brand font-mono text-[10.5px] tracking-[0.18em]">
            AVIS CLIENTS
          </span>
          <h2 className="font-display text-navy mt-2 mb-4 text-[28px] leading-tight font-extrabold tracking-tight">
            {total} commentaire{total > 1 ? "s" : ""}
          </h2>

          {total > 0 ? (
            <>
              <div className="mb-6 flex items-baseline gap-3.5">
                <span className="font-display text-navy text-[44px] leading-none font-extrabold tracking-tight">
                  {average.toFixed(1)}
                </span>
                <div className="flex flex-col gap-1">
                  <Stars value={Math.round(average)} className="text-[18px]" />
                  <span className="text-muted text-[12.5px]">
                    sur {total} avis
                  </span>
                </div>
              </div>

              <div className="mb-7 flex flex-col gap-2">
                {breakdown.map((line) => (
                  <div key={line.rating} className="flex items-center gap-2.5">
                    <span className="text-ink/80 w-9 text-[12px]">
                      {line.rating}★
                    </span>
                    <div className="bg-line h-1.5 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-brand h-full"
                        style={{ width: `${line.pct}%` }}
                      />
                    </div>
                    <span className="text-muted w-6 text-right text-[11.5px]">
                      {line.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {/* Les auteurs de tous les avis, pas seulement ceux de la page :
              le sien peut se trouver n'importe ou dans la liste. */}
          <ReviewForm
            productId={productId}
            authorIds={reviews.map((review) => review.user.id)}
          />
        </div>

        {total === 0 ? (
          <p className="border-line text-muted rounded-[14px] border border-dashed p-8 text-center text-[13.5px]">
            Aucun avis publie sur ce produit pour le moment. Soyez le premier a
            donner le votre.
          </p>
        ) : (
          <div>
            <ul className="flex flex-col">
              {shown.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  date={formatRelativeDate(review.createdAt)}
                />
              ))}
            </ul>

            <Pagination
              basePath={`/produit/${productId}`}
              page={current}
              totalPages={totalPages}
              hash="#avis"
            />
          </div>
        )}
      </div>
    </section>
  );
}
