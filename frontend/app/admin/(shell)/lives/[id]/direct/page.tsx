import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveControls } from "@/components/admin/live-controls";
import { PageHeader } from "@/components/admin/page-header";
import { LiveStatusBadge } from "@/components/admin/status-badge";
import { LiveComments } from "@/components/live/live-comments";
import { FacebookVideo } from "@/components/live/facebook-video";
import { ProductImage } from "@/components/product-image";
import { ApiError } from "@/lib/api";
import { getAdminLive } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";
import { formatPrice } from "@/lib/format";
import { formatLiveDate } from "@/lib/live";

export const metadata = { title: "Régie du live" };

/**
 * La regie : ce que la vendeuse (ou la personne qui l'assiste) garde ouvert
 * pendant le direct — la video telle que les visiteurs la voient, le fil de
 * commentaires pour y repondre au nom de « Futurama.mg », et les produits
 * avec leur stock. Le formulaire d'edition reste a part, sur « Modifier ».
 */
export default async function LiveDirectPage({
  params,
}: PageProps<"/admin/lives/[id]/direct">) {
  const { id } = await params;
  const token = await getServerToken();

  const live = await getAdminLive(id, token).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  return (
    <div>
      <PageHeader title={live.title} />

      <div className="admin-card mb-6 flex flex-wrap items-center gap-3">
        <LiveStatusBadge status={live.status} />
        <span className="text-muted text-[12.5px] first-letter:uppercase">
          {formatLiveDate(live.startedAt ?? live.scheduledAt)}
        </span>
        <div className="ml-auto flex flex-wrap gap-3">
          <LiveControls live={live} />
          <Link href={`/admin/lives/${live.id}`} className="admin-button-ghost">
            Modifier
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-6">
          {live.status !== "PROGRAMME" && live.facebookUrl ? (
            <FacebookVideo url={live.facebookUrl} title={live.title} />
          ) : (
            <div className="bg-navy flex aspect-video items-center justify-center rounded-[14px] px-6 text-center text-[13.5px] text-white/80">
              La vidéo s&apos;affichera ici dès que le live sera lancé.
            </div>
          )}

          <section className="admin-card">
            <h2 className="font-display text-navy mb-3 text-[15px] font-extrabold">
              Produits présentés
              <span className="text-muted text-[12px] font-medium">
                {" "}
                · {live.products.length}
              </span>
            </h2>
            {live.products.length === 0 ? (
              <p className="text-muted text-[13px]">
                Aucun produit. Ajoutez-les depuis « Modifier ».
              </p>
            ) : (
              <ol className="grid gap-2 sm:grid-cols-2">
                {live.products.map(({ product }, index) => (
                  <li
                    key={product.id}
                    className="border-line flex items-center gap-3 rounded-[10px] border bg-white p-2"
                  >
                    <span className="text-muted-light w-5 shrink-0 text-center text-[12px] font-bold">
                      {index + 1}
                    </span>
                    <ProductImage
                      src={product.images?.[0]?.imageUrl}
                      alt={product.name}
                      className="border-line size-10 shrink-0 rounded-[8px] border !text-base"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {product.name}
                      </span>
                      <span className="text-muted block text-[11.5px]">
                        {formatPrice(product.price)} ·{" "}
                        <span
                          className={
                            product.stock === 0
                              ? "text-brand font-semibold"
                              : undefined
                          }
                        >
                          {product.stock === 0
                            ? "en rupture"
                            : `${product.stock} en stock`}
                        </span>
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Le fil reste a l'ecran pendant qu'on fait defiler les produits. */}
        <div className="lg:sticky lg:top-6">
          <LiveComments
            liveId={live.id}
            status={live.status}
            loginPath="/admin/connexion"
            listClassName="max-h-[60vh] min-h-[300px]"
          />
        </div>
      </div>
    </div>
  );
}
