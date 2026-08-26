import Link from "next/link";

const SHOP_LINKS = [
  { label: "Jouets", slug: "jouets" },
  { label: "Electromenagere", slug: "electromenagere" },
  { label: "Robotique", slug: "robotique" },
  { label: "Voyage spatial", slug: "voyage-spatial" },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep mt-20 px-4 py-12 text-white sm:px-8 lg:px-12">
      <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="font-display text-xl font-extrabold">FUTURAMA</span>
          <p className="mt-3 max-w-[32ch] text-[13px] leading-relaxed text-white/70">
            Importateur direct a Madagascar depuis plus de 20 ans. Jouets,
            electromenager, energie et robotique.
          </p>
        </div>

        <div>
          <FooterTitle>Boutique</FooterTitle>
          <div className="flex flex-col gap-2.5 text-[13.5px] text-white/80">
            {SHOP_LINKS.map((link) => (
              <Link
                key={link.slug}
                href={`/catalogue/${link.slug}`}
                className="hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <FooterTitle>Aide</FooterTitle>
          <div className="flex flex-col gap-2.5 text-[13.5px] text-white/80">
            <span>Livraison &amp; retrait</span>
            <span>Retours &amp; garantie</span>
            <span>Suivre ma commande</span>
          </div>
        </div>

        <div>
          <FooterTitle>Contact</FooterTitle>
          <div className="flex flex-col gap-2.5 text-[13.5px] text-white/80">
            <span>+261 32 69 521 24</span>
            <span>info@futurama.mg</span>
            <span>Tsaralalana, Antananarivo</span>
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-white/15 pt-5 text-xs text-white/50">
        © {new Date().getFullYear()} Futurama Madagascar — Tous droits reserves
      </div>
    </footer>
  );
}

function FooterTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-xs font-bold tracking-[0.08em] text-white/50 uppercase">
      {children}
    </div>
  );
}
