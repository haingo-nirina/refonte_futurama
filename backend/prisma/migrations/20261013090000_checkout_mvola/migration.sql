-- Parcours de commande MVola : mode de reception, zones de livraison,
-- boutique de retrait, paiements, historique des statuts, numero lisible.
--
-- Ecrite a la main : le SQL genere par Prisma supprimait puis recreait
-- shipping_name / shipping_phone / status / payment_method, ce qui effacait
-- les donnees, et echouait sur les colonnes NOT NULL des commandes existantes.

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('EN_ATTENTE_PAIEMENT', 'PAYEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'PRETE_A_RETIRER', 'RETIREE', 'ANNULEE');
CREATE TYPE "PaymentStatus" AS ENUM ('NON_PAYE', 'PAYE', 'ECHOUE');
CREATE TYPE "FulfillmentMethod" AS ENUM ('LIVRAISON', 'RETRAIT_BOUTIQUE');
CREATE TYPE "PaymentMethod" AS ENUM ('MVOLA', 'CASH_ON_DELIVERY');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('EN_ATTENTE', 'REUSSI', 'ECHOUE');

-- Renommages : les donnees restent en place
ALTER TABLE "orders" RENAME COLUMN "shipping_name" TO "contact_name";
ALTER TABLE "orders" RENAME COLUMN "shipping_phone" TO "contact_phone";
ALTER TABLE "orders" ALTER COLUMN "shipping_address" DROP NOT NULL;

-- Nouvelles colonnes (number et fulfillment_method d'abord nullables, remplis
-- plus bas pour les commandes existantes, puis rendus obligatoires)
ALTER TABLE "orders"
ADD COLUMN "number" TEXT,
ADD COLUMN "fulfillment_method" "FulfillmentMethod",
ADD COLUMN "delivery_zone_id" TEXT,
ADD COLUMN "delivery_zone_name" TEXT,
ADD COLUMN "delivery_delay_days" INTEGER,
ADD COLUMN "expected_delivery_at" DATE,
ADD COLUMN "store_id" TEXT,
ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'NON_PAYE',
ADD COLUMN "mvola_phone" TEXT,
ADD COLUMN "paid_at" TIMESTAMP(3),
ADD COLUMN "pickup_code" CHAR(4),
ADD COLUMN "pickup_code_attempts" INTEGER NOT NULL DEFAULT 0;

-- Conversion des anciens statuts texte vers l'enum
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus" USING (
  CASE "status"
    WHEN 'pending' THEN 'EN_ATTENTE_PAIEMENT'
    WHEN 'confirmed' THEN 'EN_PREPARATION'
    WHEN 'shipped' THEN 'EXPEDIEE'
    WHEN 'delivered' THEN 'LIVREE'
    WHEN 'cancelled' THEN 'ANNULEE'
  END
)::"OrderStatus";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'EN_ATTENTE_PAIEMENT';

-- orange_money n'a jamais ete branche : rabattu sur MVOLA
ALTER TABLE "orders" ALTER COLUMN "payment_method" TYPE "PaymentMethod" USING (
  CASE "payment_method"
    WHEN 'cash_on_delivery' THEN 'CASH_ON_DELIVERY'
    ELSE 'MVOLA'
  END
)::"PaymentMethod";

-- Commandes existantes : livraison, payees si livrees
UPDATE "orders" SET "fulfillment_method" = 'LIVRAISON';
UPDATE "orders" SET "payment_status" = 'PAYE', "paid_at" = "updated_at" WHERE "status" = 'LIVREE';

-- Numero FUT-AAAA-000123 par ordre de creation, remis a zero chaque annee
UPDATE "orders" o SET "number" = numbered.value
FROM (
  SELECT "id",
    'FUT-' || EXTRACT(YEAR FROM "created_at")::INT || '-' ||
    LPAD(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "created_at") ORDER BY "created_at", "id")::TEXT, 6, '0') AS value
  FROM "orders"
) numbered
WHERE o."id" = numbered."id";

ALTER TABLE "orders" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "fulfillment_method" SET NOT NULL;

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "delay_days" INTEGER NOT NULL,
    "free_threshold" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "opening_hours" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_ref" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "raw_callback" JSONB,
    "failure_reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_counters_pkey" PRIMARY KEY ("year")
);

-- Le compteur repart apres les numeros attribues ci-dessus
INSERT INTO "order_counters" ("year", "last_value")
SELECT EXTRACT(YEAR FROM "created_at")::INT, COUNT(*)
FROM "orders"
GROUP BY 1;

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zones_name_key" ON "delivery_zones"("name");
CREATE UNIQUE INDEX "payments_provider_ref_key" ON "payments"("provider_ref");
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");
CREATE INDEX "orders_paid_at_idx" ON "orders"("paid_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
