-- Existing users have no registered shipping address.
ALTER TABLE "User" ADD COLUMN "postalCode" TEXT,
ADD COLUMN "prefecture" TEXT,
ADD COLUMN "addressLine1" TEXT,
ADD COLUMN "addressLine2" TEXT;
