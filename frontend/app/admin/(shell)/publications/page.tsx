import { AdminPagination } from "@/components/admin/admin-pagination";
import { PageHeader } from "@/components/admin/page-header";
import { PublicationManager } from "@/components/admin/publication-manager";
import { getAdminPosts } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";

export const metadata = { title: "Publications" };

const PAGE_SIZE = 10;

function readParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Le mur de la boutique, cote redaction.
 *
 * La lecture passe par la meme route que la boutique, avec le token admin :
 * le backend leve alors le filtre de publication et renvoie aussi brouillons
 * et publications programmees, classes par date de creation.
 */
export default async function AdminPublicationsPage({
  searchParams,
}: PageProps<"/admin/publications">) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(readParam(params.page), 10) || 1);

  const { data, meta } = await getAdminPosts(
    { page, limit: PAGE_SIZE },
    await getServerToken(),
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Publications"
        subtitle={`${meta.total} publication${meta.total > 1 ? "s" : ""} · la plus recente ouvre le mur de la boutique`}
      />

      <PublicationManager posts={data} />

      <AdminPagination
        basePath="/admin/publications"
        page={meta.page}
        totalPages={meta.totalPages}
      />
    </div>
  );
}
