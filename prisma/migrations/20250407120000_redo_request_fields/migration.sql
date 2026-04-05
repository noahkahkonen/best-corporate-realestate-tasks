-- AlterTable
ALTER TABLE "Task" ADD COLUMN "isRedoRequest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "redoRequestNote" TEXT;
