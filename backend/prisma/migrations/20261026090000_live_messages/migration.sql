-- Le lien Facebook n'existe qu'une fois la diffusion lancee : il est colle
-- au moment de « Demarrer », plus a la creation du live.
ALTER TABLE "lives" ALTER COLUMN "facebook_url" DROP NOT NULL;

-- live_comments devient live_messages : questions privees avec reponse de la
-- boutique. Renommage, pas DROP + CREATE : les lignes existantes sont gardees.
-- Contraintes et index sont renommes aussi, pour garder les noms que Prisma
-- genererait (sinon le prochain `migrate dev` y verrait une derive).
ALTER TABLE "live_comments" RENAME TO "live_messages";
ALTER TABLE "live_messages" RENAME COLUMN "comment" TO "message";
ALTER TABLE "live_messages" RENAME CONSTRAINT "live_comments_pkey" TO "live_messages_pkey";
ALTER TABLE "live_messages" RENAME CONSTRAINT "live_comments_live_id_fkey" TO "live_messages_live_id_fkey";
ALTER TABLE "live_messages" RENAME CONSTRAINT "live_comments_user_id_fkey" TO "live_messages_user_id_fkey";
ALTER INDEX "live_comments_live_id_created_at_idx" RENAME TO "live_messages_live_id_created_at_idx";

ALTER TABLE "live_messages"
  ADD COLUMN "product_id" TEXT,
  ADD COLUMN "reply" TEXT,
  ADD COLUMN "replied_at" TIMESTAMP(3),
  ADD COLUMN "handled_at" TIMESTAMP(3);

CREATE INDEX "live_messages_user_id_live_id_idx" ON "live_messages"("user_id", "live_id");

ALTER TABLE "live_messages" ADD CONSTRAINT "live_messages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Commande passee depuis la page live : mesure des ventes par live.
ALTER TABLE "orders" ADD COLUMN "live_id" TEXT;

CREATE INDEX "orders_live_id_idx" ON "orders"("live_id");

ALTER TABLE "orders" ADD CONSTRAINT "orders_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "lives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
