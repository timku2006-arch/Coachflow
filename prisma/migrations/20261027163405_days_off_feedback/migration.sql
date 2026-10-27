-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "feedbackAskedAt" TIMESTAMPTZ(3),
ADD COLUMN     "feedbackAt" TIMESTAMPTZ(3),
ADD COLUMN     "feedbackMood" INTEGER,
ADD COLUMN     "feedbackNote" TEXT;

-- AlterTable
ALTER TABLE "TrainerProfile" ADD COLUMN     "weeklyDaysOff" INTEGER[] DEFAULT ARRAY[7]::INTEGER[];

-- CreateTable
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeOff_trainerId_endsOn_idx" ON "TimeOff"("trainerId", "endsOn");

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "TrainerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Проверки
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_range_check" CHECK ("endsOn" >= "startsOn");
ALTER TABLE "Session" ADD CONSTRAINT "Session_feedbackMood_check" CHECK ("feedbackMood" IS NULL OR "feedbackMood" BETWEEN 1 AND 3);
