type TopProduct = { productName: string; quantity: number };

/**
 * Meilleures ventes en barres horizontales : les noms de produit sont longs,
 * ils se lisent mieux sur une ligne qu'en pied de colonne. Chaque barre porte
 * sa valeur a son extremite — cinq valeurs, pas besoin d'infobulle ni d'axe.
 */
export function TopProductsChart({ products }: { products: TopProduct[] }) {
  const [best] = products;
  const max = Math.max(...products.map((product) => product.quantity), 1);

  return (
    <div>
      <div className="bg-cream-deep mb-5 rounded-[10px] px-4 py-3">
        <p className="text-muted text-[12px] font-semibold tracking-wide uppercase">
          Produit le plus vendu
        </p>
        <p className="font-display text-navy mt-1 truncate text-lg font-extrabold">
          {best.productName}
        </p>
        <p className="text-muted text-[12.5px]">
          {best.quantity} unite(s) vendue(s)
        </p>
      </div>

      <ul className="space-y-3">
        {products.map((product) => (
          <li key={product.productName}>
            <p className="mb-1 truncate text-[13px]">{product.productName}</p>
            <div className="flex items-center gap-2">
              <span
                className="bg-navy block h-3 rounded-r-[4px]"
                style={{ width: `${(product.quantity / max) * 85}%` }}
              />
              <span className="font-display text-navy shrink-0 text-[13px] font-extrabold tabular-nums">
                {product.quantity}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
