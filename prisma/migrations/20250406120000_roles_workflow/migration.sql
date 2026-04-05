-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'MANAGER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'DENIED');
CREATE TYPE "ExecutionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE', 'NEEDS_HELP');

-- AlterTable Task: new workflow columns
ALTER TABLE "Task" ADD COLUMN "creatorId" TEXT;
ALTER TABLE "Task" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "Task" ADD COLUMN "reviewStatus" "ReviewStatus";
ALTER TABLE "Task" ADD COLUMN "executionStatus" "ExecutionStatus";
ALTER TABLE "Task" ADD COLUMN "managerNote" TEXT;
ALTER TABLE "Task" ADD COLUMN "helpNote" TEXT;

-- Migrate from legacy TaskStatus
UPDATE "Task" SET "executionStatus" = CASE
  WHEN "status"::text = 'TODO' THEN 'NOT_STARTED'::"ExecutionStatus"
  WHEN "status"::text = 'IN_PROGRESS' THEN 'IN_PROGRESS'::"ExecutionStatus"
  WHEN "status"::text = 'DONE' THEN 'DONE'::"ExecutionStatus"
  ELSE 'NOT_STARTED'::"ExecutionStatus"
END;

UPDATE "Task" SET "reviewStatus" = CASE
  WHEN "status"::text = 'TODO' THEN 'PENDING_REVIEW'::"ReviewStatus"
  ELSE 'APPROVED'::"ReviewStatus"
END;

ALTER TABLE "Task" ALTER COLUMN "reviewStatus" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "executionStatus" SET NOT NULL;

ALTER TABLE "Task" DROP COLUMN "status";
DROP TYPE "TaskStatus";

ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
