-- AlterTable
ALTER TABLE "Farm" ADD COLUMN     "lastLocationReminderAt" TIMESTAMP(3),
ADD COLUMN     "locationSetAt" TIMESTAMP(3),
ADD COLUMN     "locationSource" TEXT NOT NULL DEFAULT 'district';

-- Existing farms: a place picked at sign-up (map or GPS) is not just the district centre.
UPDATE "Farm" SET "locationSource" = 'signup'
WHERE NOT (
    ("district" = 'Sheikhupura' AND abs("lat" - 31.71) < 0.001 AND abs("lng" - 73.98) < 0.001)
    OR ("district" = 'Gujranwala' AND abs("lat" - 32.16) < 0.001 AND abs("lng" - 74.19) < 0.001)
    OR ("district" = 'Hafizabad' AND abs("lat" - 32.07) < 0.001 AND abs("lng" - 73.69) < 0.001)
    OR ("district" = 'Narowal' AND abs("lat" - 32.1) < 0.001 AND abs("lng" - 74.87) < 0.001)
    OR ("district" = 'Sargodha' AND abs("lat" - 32.08) < 0.001 AND abs("lng" - 72.67) < 0.001)
    OR ("district" = 'Okara' AND abs("lat" - 30.81) < 0.001 AND abs("lng" - 73.45) < 0.001)
    OR ("district" = 'Kasur' AND abs("lat" - 31.12) < 0.001 AND abs("lng" - 74.45) < 0.001)
    OR ("district" = 'Lahore' AND abs("lat" - 31.52) < 0.001 AND abs("lng" - 74.36) < 0.001)
    OR ("district" = 'Faisalabad' AND abs("lat" - 31.42) < 0.001 AND abs("lng" - 73.08) < 0.001)
    OR ("district" = 'Sialkot' AND abs("lat" - 32.49) < 0.001 AND abs("lng" - 74.53) < 0.001)
);
