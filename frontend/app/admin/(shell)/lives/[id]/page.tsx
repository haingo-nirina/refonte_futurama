import { notFound } from "next/navigation";
import { LiveControls } from "@/components/admin/live-controls";
import { LiveForm } from "@/components/admin/live-form";
import { LiveReplayPanel } from "@/components/admin/live-replay-panel";
import { PageHeader } from "@/components/admin/page-header";
import { LiveStatusBadge } from "@/components/admin/status-badge";
import { ApiError } from "@/lib/api";
import { getAdminLive } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Edition du live" };

export default async function EditLivePage({
  params,
}: PageProps<"/admin/lives/[id]">) {
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
        <span className="text-muted text-[12.5px]">
          {live.startedAt ? `Démarré le ${formatDateTime(live.startedAt)}` : null}
          {live.endedAt ? ` · terminé le ${formatDateTime(live.endedAt)}` : null}
        </span>
        <div className="ml-auto flex flex-wrap gap-3">
          <LiveControls live={live} />
        </div>
      </div>

      {live.status === "TERMINE" ? <LiveReplayPanel live={live} /> : null}

      <LiveForm live={live} />
    </div>
  );
}
