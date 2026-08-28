import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getMarques } from "@/lib/api";

export const metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  const [categories, marques] = await Promise.all([
    getCategories(),
    getMarques(),
  ]);

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/produits"
        className="text-muted hover:text-brand text-[12.5px]"
      >
        ← Tous les produits
      </Link>

      <h1 className="font-display text-navy mt-3 mb-1 text-2xl font-extrabold">
        Nouveau produit
      </h1>
      <p className="text-muted mb-6 text-sm">
        Galerie, caracteristiques et produits lies se renseignent apres la
        creation : ils ont besoin de l&apos;identifiant du produit.
      </p>

      <ProductForm categories={categories} marques={marques} />
    </div>
  );
}
