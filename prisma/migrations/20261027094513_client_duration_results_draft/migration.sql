-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN     "sessionDurationMin" INTEGER NOT NULL DEFAULT 90;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "resultsDraft" JSONB;

-- Допустимые длительности занятия
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_sessionDurationMin_check" CHECK ("sessionDurationMin" IN (60, 75, 90));
