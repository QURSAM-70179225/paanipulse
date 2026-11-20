-- Whether a day's pump hours were actually given (by the farmer or telemetry), not a 0-hour placeholder.
ALTER TABLE "DailyRecord" ADD COLUMN "hoursReported" BOOLEAN NOT NULL DEFAULT false;

-- Existing records: count days with hours as answered. A 0-hour day may be a placeholder, so the farmer is asked again.
UPDATE "DailyRecord" SET "hoursReported" = true WHERE "actualHours" > 0;
