-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "farmId" TEXT,
    "pairedAt" TIMESTAMP(3),
    "pairedBy" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "network" TEXT,
    "signal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_code_key" ON "Device"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Device_secretHash_key" ON "Device"("secretHash");

-- CreateIndex
CREATE INDEX "Device_farmId_idx" ON "Device"("farmId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
