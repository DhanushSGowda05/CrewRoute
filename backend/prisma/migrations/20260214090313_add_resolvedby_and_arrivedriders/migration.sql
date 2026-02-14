-- AlterTable
ALTER TABLE "emergency_alerts" ADD COLUMN     "resolved_by" TEXT;

-- AlterTable
ALTER TABLE "regroup_points" ADD COLUMN     "arrived_riders" JSONB DEFAULT '[]';
