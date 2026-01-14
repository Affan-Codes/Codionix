-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyOnApplicationReceived" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnApplicationStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnDeadlineReminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnWeeklyDigest" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "deadline_status_idx" ON "projects"("deadline", "status");
