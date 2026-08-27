import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, getCategories, getProduct } from "@/lib/api";
import { discountLabel, formatPrice } from "@/lib/format";
import type { ProductDetail } from "@/lib/types";
import { AddToCart } from "./add-to-cart";
import { Gallery } from "./gallery";

const REASSURANCE = [
  { title: "Livraison Antananarivo", desc: "Offerte des 300 000 Ar." },
  { title: "Retrait boutique", desc: "Tsaralalana, sans frais." },
  { title: "Retours 7 jours", desc: "Produit non ouvert." },
  { title: "Paiement securise", desc: "Mvola, Orange Money, a la livraison." },
];

async function loadProduct(id: string): Promise<ProductDetail> {
  try {
    return await getProduct(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export default async function ProductPage({
  params,
}: PageProps<"/produit/[id]">) {
  const { id } = await params;

  const product = await loadProduct(id);
  const categories = await getCategories().catch(() => []);
  const category = categories.find((item) => item.id === product.categoryId);

  const discount = discountLabel(product);

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-12">
      <nav className="text-muted mb-6 text-[12.5px]">
        <Link href="/" className="hover:text-brand">
          Accueil
        </Link>
        {category ? (
          <>
            {" · "}
            <Link
              href={`/catalogue/${category.slug}`}
              className="hover:text-brand"
            >
              {category.name}
            </Link>
          </>
        ) : null}
        {" · "}
        <span className="text-ink font-medium">{product.name}</span>
      </nav>

      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
        <Gallery images={product.images} name={product.name} />

        <div>
          <span className="text-muted font-mono text-[10.5px] tracking-[0.16em]">
            {(category?.name ?? "CATALOGUE").toUpperCase()}
            {product.reference ? ` · REF. ${product.reference}` : ""}
          </span>

          <h1 className="font-display text-navy mt-2.5 text-[32px] leading-tight font-extrabold tracking-tight">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-brand text-[34px] font-extrabold tracking-tight">
              {formatPrice(product.promoPrice ?? product.price)}
            </span>
            {discount ? (
              <span className="bg-brand rounded-md px-2.5 py-1 text-[12.5px] font-bold text-white">
                {discount}
              </span>
            ) : null}
          </div>

          {discount ? (
            <div className="text-muted mt-2 text-[13px]">
              Prix conseille :{" "}
              <span className="line-through">{formatPrice(product.price)}</span>
            </div>
          ) : null}

          {product.description ? (
            <p className="text-ink/80 border-line mt-5 border-t pt-5 text-[14px] leading-relaxed">
              {product.description}
            </p>
          ) : null}

          <div className="border-line bg-cream-deep mt-6 rounded-[14px] border-[1.5px] p-5">
            <span
              className={`mb-4 inline-block rounded-md px-3 py-1.5 text-[12.5px] font-semibold ${
                product.stock > 0
                  ? "bg-success-soft text-success"
                  : "bg-line text-muted"
              }`}
            >
              {product.stock > 0
                ? `En stock · ${product.stock} piece${product.stock > 1 ? "s" : ""}`
                : "Rupture de stock"}
            </span>

            <AddToCart productId={product.id} stock={product.stock} />

            <div className="border-line text-muted mt-4 flex flex-col gap-1.5 border-t pt-4 text-xs">
              <span>
                Vendu et expedie par{" "}
                <strong className="text-navy">Futurama.mg</strong>
              </span>
              <span>Retours gratuits sous 7 jours</span>
              <span>Paiement Mvola, Orange Money ou a la livraison</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {REASSURANCE.map((item) => (
              <div
                key={item.title}
                className="bg-cream-deep rounded-[10px] px-4 py-3.5"
              >
                <div className="text-ink text-[13px] font-bold">
                  {item.title}
                </div>
                <div className="text-muted mt-0.5 text-[12.5px]">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>

          {product.specs.length > 0 ? (
            <section className="border-line mt-8 border-t pt-6">
              <h2 className="font-display text-navy mb-3.5 text-[15px] font-bold">
                Caracteristiques
              </h2>
              <dl className="flex flex-col">
                {product.specs.map((spec) => (
                  <div
                    key={spec.id}
                    className="border-line flex justify-between border-b py-3 text-[13.5px] last:border-b-0"
                  >
                    <dt className="text-muted">{spec.label}</dt>
                    <dd className="text-ink font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps<"/produit/[id]">) {
  const { id } = await params;
  const product = await getProduct(id).catch(() => null);

  return { title: product?.name ?? "Produit" };
}
