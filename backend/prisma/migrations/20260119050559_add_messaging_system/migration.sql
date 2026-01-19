-- DropIndex
DROP INDEX "messages_createdAt_idx";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "messages_isDeleted_createdAt_idx" ON "messages"("isDeleted", "createdAt");
