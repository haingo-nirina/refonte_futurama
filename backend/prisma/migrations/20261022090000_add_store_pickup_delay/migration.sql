-- Delai de preparation d'une boutique de retrait : 0 = commande disponible
-- tout de suite (« En stock »), sinon « Pret sous N jours ».
ALTER TABLE "stores" ADD COLUMN "pickup_delay_days" INTEGER NOT NULL DEFAULT 0;
