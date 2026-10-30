import { LiveForm } from "@/components/admin/live-form";
import { PageHeader } from "@/components/admin/page-header";

export const metadata = { title: "Programmer un live" };

export default function NewLivePage() {
  return (
    <div>
      <PageHeader
        title="Programmer un live"
        subtitle="Annoncé sur la page /live avec ses produits, jusqu'à ce que vous le lanciez."
      />
      <LiveForm />
    </div>
  );
}
