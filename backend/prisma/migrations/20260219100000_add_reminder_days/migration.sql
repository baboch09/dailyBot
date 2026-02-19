-- AlterTable
-- Режим «Неделя»: дни напоминания (ISO 1=Пн … 7=Вс), например "1,2,3,4,5". null = каждый день
ALTER TABLE "Habit" ADD COLUMN "reminderDays" TEXT;
