-- Introduction des comptes (table `users`) et rattachement des actions
-- sensibles a un utilisateur.
--
-- DESTRUCTIF : les colonnes supprimees (customers, orders.customer_*,
-- reviews.author_name, post_comments.author_name, post_likes.session_id) ne
-- sont pas migrees vers user_id -- il n' existe aucun rapprochement possible.
-- Les colonnes user_id sont ajoutees en NOT NULL sans defaut : cette migration
-- ne passe que sur des tables vides (base de dev resettee).

-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT "carts_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_customer_id_fkey";

-- DropIndex
DROP INDEX "post_likes_post_id_session_id_key";

-- AlterTable
ALTER TABLE "carts" DROP COLUMN "customer_id",
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "customer_address",
DROP COLUMN "customer_id",
DROP COLUMN "customer_name",
DROP COLUMN "customer_phone",
ADD COLUMN     "shipping_address" TEXT NOT NULL,
ADD COLUMN     "shipping_name" TEXT NOT NULL,
ADD COLUMN     "shipping_phone" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "post_comments" DROP COLUMN "author_name",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "post_likes" DROP COLUMN "session_id",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "author_name",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "customers";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_id_user_id_key" ON "post_likes"("post_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_product_id_user_id_key" ON "reviews"("product_id", "user_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;