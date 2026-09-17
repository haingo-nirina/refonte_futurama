import { PageHeader } from "@/components/admin/page-header";
import { PromotionManager } from "@/components/admin/promotion-manager";
import { getAdminPromotions } from "@/lib/admin-api";
import { getServerToken } from "@/lib/auth-server";

export const metadata = { title: "Promotions" };

function readParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** `""` = pas de filtre ; sinon `"true"` / `"false"`. */
function readFlag(value: string): boolean | undefined {
  return value === "" ? undefined : value === "true";
}

export default async function AdminPromotionsPage({
  searchParams,
}: PageProps<"/admin/promotions">) {
  const params = await searchParams;

  const state = readParam(params.state);
  const featured = readParam(params.featured);

  const token = await getServerToken();
  const promotions = await getAdminPromotions(
    { isActive: readFlag(state), isFeatured: readFlag(featured) },
    token,
  );

  return (
    <div>
      <PageHeader
        title="Promotions"
        subtitle={`${promotions.length} promotion(s)`}
      />

      {/* Formulaire GET natif, comme les autres listes du backoffice : les
          filtres vivent dans l'URL, donc partageables et rechargeables, et
          n'exigent aucun JS. */}
      <form
        method="get"
        className="border-line mb-6 grid gap-3 rounded-[14px] border bg-white p-4 sm:grid-cols-3"
      >
        <label className="block">
          <span className="admin-label">Etat</span>
          <select name="state" defaultValue={state} className="admin-input">
            <option value="">Tous</option>
            <option value="true">Actives</option>
            <option value="false">Desactivees</option>
          </select>
        </label>

        <label className="block">
          <span className="admin-label">Mise en avant</span>
          <select
            name="featured"
            defaultValue={featured}
            className="admin-input"
          >
            <option value="">Toutes</option>
            <option value="true">Promotion du mois</option>
            <option value="false">Hors accueil</option>
          </select>
        </label>

        <div className="flex items-end">
          <button type="submit" className="admin-button w-full sm:w-auto">
            Filtrer
          </button>
        </div>
      </form>

      <PromotionManager promotions={promotions} />
    </div>
  );
}
