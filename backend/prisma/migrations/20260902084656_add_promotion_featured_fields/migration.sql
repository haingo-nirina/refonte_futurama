-- AlterTable
--
-- `updated_at` est NOT NULL sans defaut cote Prisma (`@updatedAt` est tenu par
-- le client, pas par Postgres). La table n'est pas vide : on ajoute la colonne
-- avec un defaut le temps de remplir les lignes existantes, puis on le retire
-- pour que le schema en base corresponde exactement a ce que Prisma attend.
ALTER TABLE "promotions" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "titre" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "promotions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "promotions_product_id_is_active_start_date_end_date_idx" ON "promotions"("product_id", "is_active", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "promotions_is_featured_is_active_start_date_end_date_idx" ON "promotions"("is_featured", "is_active", "start_date", "end_date");
