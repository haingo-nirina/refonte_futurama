-- AlterTable
ALTER TABLE "products" ADD COLUMN     "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dimensions" TEXT;
