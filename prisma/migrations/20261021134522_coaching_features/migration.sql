-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'MISSED';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "confirmedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "PersonalRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "previousWeightKg" DOUBLE PRECISION,
    "previousReps" INTEGER,
    "achievedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressPhoto" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "takenOn" DATE NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "waistCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "armCm" DOUBLE PRECISION,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAchievement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "earnedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "remainingSessions" INTEGER NOT NULL,
    "validFrom" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "paidAt" TIMESTAMPTZ(3),
    "priceRub" INTEGER,
    "note" TEXT,
    "remindedLowAt" TIMESTAMPTZ(3),
    "remindedExpiryAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipEntry" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "sessionId" TEXT,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalRecord_clientId_achievedAt_idx" ON "PersonalRecord"("clientId", "achievedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalRecord_sessionId_exerciseId_key" ON "PersonalRecord"("sessionId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressPhoto_storageKey_key" ON "ProgressPhoto"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressPhoto_thumbKey_key" ON "ProgressPhoto"("thumbKey");

-- CreateIndex
CREATE INDEX "ProgressPhoto_clientId_takenOn_idx" ON "ProgressPhoto"("clientId", "takenOn");

-- CreateIndex
CREATE UNIQUE INDEX "BodyMeasurement_clientId_date_key" ON "BodyMeasurement"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAchievement_clientId_code_key" ON "ClientAchievement"("clientId", "code");

-- CreateIndex
CREATE INDEX "Membership_clientId_validUntil_idx" ON "Membership"("clientId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipEntry_sessionId_key" ON "MembershipEntry"("sessionId");

-- CreateIndex
CREATE INDEX "MembershipEntry_membershipId_createdAt_idx" ON "MembershipEntry"("membershipId", "createdAt");

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAchievement" ADD CONSTRAINT "ClientAchievement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEntry" ADD CONSTRAINT "MembershipEntry_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEntry" ADD CONSTRAINT "MembershipEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Защита данных абонемента на уровне БД
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_counts_check"
  CHECK ("totalSessions" > 0 AND "remainingSessions" >= 0);
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_dates_check"
  CHECK ("validUntil" >= "validFrom");
