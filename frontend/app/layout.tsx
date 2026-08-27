import type { Metadata } from "next";
import { Archivo, DM_Sans } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Futurama — importateur direct a Madagascar",
    template: "%s · Futurama",
  },
  description:
    "Jouets, electromenager, energie et robotique. Prix importateur, stock a Antananarivo.",
};

/**
 * Layout racine volontairement nu : il ne porte que les polices et la feuille
 * de styles.
 *
 * L'en-tete et le pied de page appartiennent a la boutique et vivent dans
 * `app/(boutique)/layout.tsx` ; le backoffice a son propre habillage dans
 * `app/admin/layout.tsx`. Un layout enfant ne pouvant pas retirer le chrome de
 * son parent, c'est le seul moyen d'avoir deux enveloppes distinctes.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="font-sans flex min-h-full flex-col">{children}</body>
    </html>
  );
}
