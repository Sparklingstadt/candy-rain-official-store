-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;
