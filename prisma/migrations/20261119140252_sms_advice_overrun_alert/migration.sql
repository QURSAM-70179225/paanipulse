-- AlterTable
ALTER TABLE "Pump" ADD COLUMN     "lastOverrunAlert" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "smsAdvice" BOOLEAN NOT NULL DEFAULT false;
