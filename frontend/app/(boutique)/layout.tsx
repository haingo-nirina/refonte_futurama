import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Enveloppe de la boutique. Le groupe `(boutique)` ne change aucune URL. */
export default function BoutiqueLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
