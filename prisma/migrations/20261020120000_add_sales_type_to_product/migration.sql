-- CreateEnum
CREATE TYPE "SalesType" AS ENUM ('PRE_SALE', 'MADE_TO_ORDER', 'POST_EVENT', 'PERMANENT');

-- Existing products are treated as permanently available.
ALTER TABLE "Product" ADD COLUMN "salesType" "SalesType" NOT NULL DEFAULT 'PERMANENT';
