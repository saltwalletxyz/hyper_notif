-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationChannel" ADD VALUE 'DISCORD';
ALTER TYPE "public"."NotificationChannel" ADD VALUE 'TELEGRAM';

-- AlterTable
ALTER TABLE "public"."Alert" ADD COLUMN     "notifyDiscord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyTelegram" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "discordUserId" TEXT,
ADD COLUMN     "telegramChatId" TEXT;
