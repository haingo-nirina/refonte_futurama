import { PageHeader } from "@/components/admin/page-header";
import { MarqueManager } from "@/components/admin/marque-manager";
import { getMarques } from "@/lib/api";

export const metadata = { title: "Marques" };

export default async function AdminMarquesPage() {
  const marques = await getMarques();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Marques"
        subtitle="Elles alimentent le filtre « Marques » du catalogue et se choisissent sur la fiche produit."
      />
      <MarqueManager marques={marques} />
    </div>
  );
}
