import Link from "next/link";

/**
 * `params` porte les filtres courants (recherche, facettes, tri) sans `page` :
 * changer de page ne doit rien perdre de ce que le visiteur a coche.
 */
export function Pagination({
  basePath,
  page,
  totalPages,
  params,
  hash,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  params?: URLSearchParams;
  /** `#avis` : sans ancre, changer de page renverrait en haut de la fiche. */
  hash?: string;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams(params);
    search.delete("page");
    if (target > 1) search.set("page", String(target));
    const suffix = search.toString();
    return `${basePath}${suffix ? `?${suffix}` : ""}${hash ?? ""}`;
  };

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      <PageLink href={href(page - 1)} disabled={page <= 1}>
        ‹
      </PageLink>

      {pages.map((target) => (
        <PageLink key={target} href={href(target)} current={target === page}>
          {target}
        </PageLink>
      ))}

      <PageLink href={href(page + 1)} disabled={page >= totalPages}>
        ›
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
}) {
  const className =
    "font-display flex h-[38px] min-w-[38px] items-center justify-center rounded-[9px] border-[1.5px] px-2 text-[13.5px] font-bold";

  if (disabled) {
    return (
      <span
        aria-disabled
        className={`${className} border-line text-muted-light`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={
        current
          ? `${className} border-brand bg-brand text-white`
          : `${className} border-line-strong hover:border-brand hover:text-brand text-ink bg-white`
      }
    >
      {children}
    </Link>
  );
}
