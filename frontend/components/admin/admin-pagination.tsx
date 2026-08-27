import Link from "next/link";

/**
 * Pagination des listes du backoffice.
 *
 * Elle differe de `components/pagination.tsx` sur un point : elle reporte
 * *tous* les filtres courants dans les liens, la ou la boutique n'a que `q`.
 * Changer de page ne doit pas reinitialiser un filtre de statut ou de date.
 */
export function AdminPagination({
  basePath,
  page,
  totalPages,
  params = {},
}: {
  basePath: string;
  page: number;
  totalPages: number;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }

    if (target > 1) search.set("page", String(target));

    const suffix = search.toString();
    return `${basePath}${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-3 text-[13px]"
    >
      <PageLink href={href(page - 1)} disabled={page <= 1}>
        ‹ Precedent
      </PageLink>

      <span className="text-muted">
        Page {page} sur {totalPages}
      </span>

      <PageLink href={href(page + 1)} disabled={page >= totalPages}>
        Suivant ›
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  disabled: boolean;
}) {
  const className =
    "rounded-[9px] border-[1.5px] px-3 py-2 font-bold transition";

  if (disabled) {
    return (
      <span aria-disabled className={`${className} border-line text-muted-light`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${className} border-line-strong text-ink hover:border-brand hover:text-brand bg-white`}
    >
      {children}
    </Link>
  );
}
