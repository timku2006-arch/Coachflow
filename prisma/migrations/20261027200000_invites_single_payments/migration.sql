-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "paidAt" TIMESTAMPTZ(3),
ADD COLUMN     "paidRub" INTEGER;

-- AlterTable
ALTER TABLE "TrainerProfile" ADD COLUMN     "sessionPriceRub" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inviteExpiresAt" TIMESTAMPTZ(3),
ADD COLUMN     "inviteToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");


-- Учёт разовых тренировок начинается с момента обновления: всё, что проведено раньше
-- и не списано с абонемента, считаем рассчитанным, чтобы не появились «долги» за прошлое.
UPDATE "Session" s SET "paidAt" = NOW()
WHERE s.status = 'COMPLETED' AND s."paidAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "MembershipEntry" e WHERE e."sessionId" = s.id);

ALTER TABLE "TrainerProfile" ADD CONSTRAINT "TrainerProfile_sessionPriceRub_check" CHECK ("sessionPriceRub" IS NULL OR "sessionPriceRub" >= 0);
