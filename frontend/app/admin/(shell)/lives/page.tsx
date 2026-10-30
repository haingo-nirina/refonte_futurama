import { LiveList } from "@/components/admin/live-list";
import { PageHeader } from "@/components/admin/page-header";
import { getAdminLives } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";

export const metadata = { title: "Live shopping" };

export default async function AdminLivesPage() {
  const token = await getServerToken();
  const lives = await getAdminLives(token);

  return (
    <div>
      <PageHeader
        title="Live shopping"
        subtitle="Programmez le live et ses produits. Le jour venu, lancez la diffusion sur Facebook, puis « Lancer le live » avec le lien de la vidéo."
        action={{ href: "/admin/lives/nouveau", label: "Programmer un live" }}
      />

      <LiveList lives={lives} />
    </div>
  );
}
