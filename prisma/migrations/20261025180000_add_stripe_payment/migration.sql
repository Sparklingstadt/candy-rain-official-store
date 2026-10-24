-- Stripe holds the card details; the store keeps only references and a display label.
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

ALTER TABLE "Order" ADD COLUMN "paymentIntentId" TEXT,
ADD COLUMN "paymentMethodLabel" TEXT;
CREATE UNIQUE INDEX "Order_paymentIntentId_key" ON "Order"("paymentIntentId");
