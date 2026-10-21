-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('PROGRAMME', 'EN_DIRECT', 'TERMINE');

-- CreateTable
CREATE TABLE "lives" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "facebook_url" TEXT NOT NULL,
    "status" "LiveStatus" NOT NULL DEFAULT 'PROGRAMME',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_products" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "live_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_comments" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_products_live_id_product_id_key" ON "live_products"("live_id", "product_id");

-- CreateIndex
CREATE INDEX "live_comments_live_id_created_at_idx" ON "live_comments"("live_id", "created_at");

-- AddForeignKey
ALTER TABLE "live_products" ADD CONSTRAINT "live_products_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_products" ADD CONSTRAINT "live_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_comments" ADD CONSTRAINT "live_comments_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "lives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_comments" ADD CONSTRAINT "live_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

