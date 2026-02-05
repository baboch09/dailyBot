-- AlterTable
-- Добавляем опциональные поля целей для привычек (обратная совместимость)
ALTER TABLE "Habit" ADD COLUMN "goalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Habit" ADD COLUMN "goalType" TEXT;
ALTER TABLE "Habit" ADD COLUMN "goalTarget" INTEGER;
ALTER TABLE "Habit" ADD COLUMN "goalPeriodDays" INTEGER;
