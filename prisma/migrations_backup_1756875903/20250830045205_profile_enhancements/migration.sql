-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('PERSONAL', 'COMPANY');

-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "accountType" "public"."AccountType" NOT NULL DEFAULT 'PERSONAL',
ADD COLUMN     "portfolioUrl" VARCHAR(500),
ADD COLUMN     "professions" TEXT[] DEFAULT ARRAY[]::TEXT[];
