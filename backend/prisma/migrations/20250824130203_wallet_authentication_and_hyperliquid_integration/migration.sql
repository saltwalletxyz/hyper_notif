-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "connectedAt" TIMESTAMP(3),
ADD COLUMN     "hyperliquidAccountValue" DOUBLE PRECISION,
ADD COLUMN     "hyperliquidLastSync" TIMESTAMP(3),
ADD COLUMN     "isWalletUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "walletType" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."HyperliquidPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coin" TEXT NOT NULL,
    "szi" TEXT NOT NULL,
    "entryPx" TEXT NOT NULL,
    "positionValue" TEXT NOT NULL,
    "unrealizedPnl" TEXT NOT NULL,
    "returnOnEquity" TEXT NOT NULL,
    "leverage" TEXT NOT NULL,
    "maxLeverage" TEXT,
    "liquidationPx" TEXT,
    "marginUsed" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HyperliquidPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HyperliquidOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coin" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "limitPx" TEXT NOT NULL,
    "sz" TEXT NOT NULL,
    "oid" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "origSz" TEXT NOT NULL,
    "orderType" TEXT,
    "reduceOnly" BOOLEAN NOT NULL DEFAULT false,
    "ioc" BOOLEAN NOT NULL DEFAULT false,
    "cloid" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HyperliquidOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HyperliquidFunding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coin" TEXT NOT NULL,
    "fundingRate" TEXT NOT NULL,
    "premium" TEXT,
    "fundingPayment" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HyperliquidFunding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HyperliquidPosition_userId_idx" ON "public"."HyperliquidPosition"("userId");

-- CreateIndex
CREATE INDEX "HyperliquidPosition_coin_idx" ON "public"."HyperliquidPosition"("coin");

-- CreateIndex
CREATE UNIQUE INDEX "HyperliquidPosition_userId_coin_key" ON "public"."HyperliquidPosition"("userId", "coin");

-- CreateIndex
CREATE INDEX "HyperliquidOrder_userId_idx" ON "public"."HyperliquidOrder"("userId");

-- CreateIndex
CREATE INDEX "HyperliquidOrder_coin_idx" ON "public"."HyperliquidOrder"("coin");

-- CreateIndex
CREATE UNIQUE INDEX "HyperliquidOrder_userId_oid_key" ON "public"."HyperliquidOrder"("userId", "oid");

-- CreateIndex
CREATE INDEX "HyperliquidFunding_userId_idx" ON "public"."HyperliquidFunding"("userId");

-- CreateIndex
CREATE INDEX "HyperliquidFunding_timestamp_idx" ON "public"."HyperliquidFunding"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "HyperliquidFunding_userId_coin_timestamp_key" ON "public"."HyperliquidFunding"("userId", "coin", "timestamp");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "public"."User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_isWalletUser_idx" ON "public"."User"("isWalletUser");

-- AddForeignKey
ALTER TABLE "public"."HyperliquidPosition" ADD CONSTRAINT "HyperliquidPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HyperliquidOrder" ADD CONSTRAINT "HyperliquidOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HyperliquidFunding" ADD CONSTRAINT "HyperliquidFunding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
