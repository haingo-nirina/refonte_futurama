-- Un live termine est un replay ; la boutique peut le retirer de la section
-- « Nos vidéos » sans le supprimer (sa mesure des ventes reste).
ALTER TABLE "lives" ADD COLUMN "replay_visible" BOOLEAN NOT NULL DEFAULT true;
