-- Colonne ajoutee hors migrations (absente de schema.prisma, lue par aucun
-- code) : elle faisait detecter une derive a `migrate dev`, qui proposait
-- alors de reinitialiser la base. IF EXISTS : une base recreee depuis les
-- migrations ne l'a jamais eue.
ALTER TABLE "post_comments" DROP COLUMN IF EXISTS "moderation_status";
