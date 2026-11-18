-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmerName" TEXT NOT NULL,
    "phone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ur',
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "district" TEXT NOT NULL,
    "tehsil" TEXT,
    "cropType" TEXT NOT NULL,
    "sowingDate" DATETIME NOT NULL,
    "areaAcres" REAL NOT NULL,
    "irrigationMethod" TEXT NOT NULL,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "dataConsent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Pump" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmId" TEXT NOT NULL,
    "ratedKw" REAL NOT NULL,
    "pvKwp" REAL NOT NULL,
    "staticDepthFt" REAL NOT NULL,
    "boreDepthFt" REAL,
    "drawdownM" REAL NOT NULL DEFAULT 3,
    "efficiency" REAL NOT NULL DEFAULT 0.4,
    "calibrated" BOOLEAN NOT NULL DEFAULT false,
    "hasTelemetry" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Pump_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TelemetryReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pumpId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "powerKw" REAL NOT NULL,
    "frequencyHz" REAL NOT NULL,
    CONSTRAINT "TelemetryReading_pumpId_fkey" FOREIGN KEY ("pumpId") REFERENCES "Pump" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "actualHours" REAL NOT NULL,
    "et0" REAL,
    "etc" REAL,
    "rainMm" REAL,
    "depletionMm" REAL,
    "needM3" REAL,
    "pumpedM3" REAL,
    "recommendedHours" REAL,
    "excessM3" REAL,
    "wastedKwh" REAL,
    "pvKwh" REAL,
    "spareKwh" REAL,
    CONSTRAINT "DailyRecord_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Advisory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "textUrdu" TEXT NOT NULL,
    "textRomanUrdu" TEXT NOT NULL,
    "textEnglish" TEXT NOT NULL,
    "audioUrl" TEXT,
    "sentVia" TEXT NOT NULL DEFAULT 'app',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Advisory_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TelemetryReading_pumpId_timestamp_idx" ON "TelemetryReading"("pumpId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecord_farmId_date_key" ON "DailyRecord"("farmId", "date");
