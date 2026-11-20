-- AlterTable
ALTER TABLE "Pump" ADD COLUMN     "autoStopWhenFull" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "controlEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "desiredOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deviceOn" BOOLEAN,
ADD COLUMN     "deviceSeenAt" TIMESTAMP(3),
ADD COLUMN     "offAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PumpControlLog" (
    "id" TEXT NOT NULL,
    "pumpId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,

    CONSTRAINT "PumpControlLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PumpControlLog_pumpId_at_idx" ON "PumpControlLog"("pumpId", "at");

-- AddForeignKey
ALTER TABLE "PumpControlLog" ADD CONSTRAINT "PumpControlLog_pumpId_fkey" FOREIGN KEY ("pumpId") REFERENCES "Pump"("id") ON DELETE CASCADE ON UPDATE CASCADE;
