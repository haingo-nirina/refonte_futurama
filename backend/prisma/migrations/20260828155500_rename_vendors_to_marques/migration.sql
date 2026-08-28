-- `Vendor` devient `Marque` : c'est bien une marque de produit, pas un vendeur.
-- Le vendeur n'est plus une donnee du tout (la boutique vend en direct, il est
-- ecrit en dur cote front), la table n'a donc pas de remplacante.
--
-- Renommage plutot que DROP + CREATE : les marques deja saisies et les produits
-- qui leur sont rattaches doivent survivre a la migration.
ALTER TABLE "vendors" RENAME TO "marques";
ALTER TABLE "marques" RENAME CONSTRAINT "vendors_pkey" TO "marques_pkey";
ALTER INDEX "vendors_slug_key" RENAME TO "marques_slug_key";

ALTER TABLE "products" RENAME COLUMN "vendor_id" TO "marque_id";
ALTER TABLE "products" RENAME CONSTRAINT "products_vendor_id_fkey" TO "products_marque_id_fkey";
