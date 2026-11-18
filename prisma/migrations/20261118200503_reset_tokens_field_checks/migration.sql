-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldCheck" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hour" INTEGER NOT NULL,
    "volumeL" DOUBLE PRECISION NOT NULL,
    "seconds" DOUBLE PRECISION NOT NULL,
    "inverterKw" DOUBLE PRECISION,
    "measuredLph" DOUBLE PRECISION NOT NULL,
    "predictedLph" DOUBLE PRECISION NOT NULL,
    "powerSource" TEXT NOT NULL,
    "errorPct" DOUBLE PRECISION NOT NULL,
    "calibrated" BOOLEAN NOT NULL,
    "note" TEXT,

    CONSTRAINT "FieldCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldCheck" ADD CONSTRAINT "FieldCheck_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
