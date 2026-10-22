import { DeliveryZoneManager } from "@/components/admin/delivery-zone-manager";
import { PageHeader } from "@/components/admin/page-header";
import { StoreManager } from "@/components/admin/store-manager";
import { getAdminDeliveryZones, getAdminStores } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";

export const metadata = { title: "Livraison & retrait" };

export default async function AdminLivraisonPage() {
  const token = await getServerToken();
  const [zones, stores] = await Promise.all([
    getAdminDeliveryZones(token),
    getAdminStores(token),
  ]);

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        title="Livraison & retrait"
        subtitle="Les deux modes de réception proposés dans le récapitulatif du panier."
      />
      <DeliveryZoneManager zones={zones} />
      <StoreManager stores={stores} />
    </div>
  );
}
