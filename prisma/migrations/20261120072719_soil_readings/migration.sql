-- CreateTable
CREATE TABLE "SoilReading" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "deviceId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "moisturePct" DOUBLE PRECISION NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "ecDsM" DOUBLE PRECISION,
    "nitrogenMgKg" DOUBLE PRECISION,
    "phosphorusMgKg" DOUBLE PRECISION,
    "potassiumMgKg" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'sensor',

    CONSTRAINT "SoilReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SoilReading_farmId_timestamp_idx" ON "SoilReading"("farmId", "timestamp");

-- AddForeignKey
ALTER TABLE "SoilReading" ADD CONSTRAINT "SoilReading_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
