-- AlterTable
ALTER TABLE "Farm" ADD COLUMN     "areaUnit" TEXT NOT NULL DEFAULT 'acre',
ADD COLUMN     "fertPlan" JSONB;
