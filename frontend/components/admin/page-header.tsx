import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-navy text-2xl font-extrabold">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-muted mt-1 text-sm">{subtitle}</p>
        ) : null}
      </div>

      {action ? (
        <Link
          href={action.href}
          className="bg-brand hover:bg-brand-dark rounded-[10px] px-4 py-2.5 text-[13.5px] font-bold text-white transition"
        >
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}
