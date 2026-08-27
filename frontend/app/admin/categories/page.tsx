import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/admin/page-header";
import { getCategories } from "@/lib/api";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Categories"
        subtitle="Les rayons de l'accueil sont ceux marques « mise en avant »."
      />
      <CategoryManager categories={categories} />
    </div>
  );
}
