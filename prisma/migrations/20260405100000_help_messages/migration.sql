-- CreateTable
CREATE TABLE "HelpMessage" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelpMessage_taskId_createdAt_idx" ON "HelpMessage"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "HelpMessage" ADD CONSTRAINT "HelpMessage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HelpMessage" ADD CONSTRAINT "HelpMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
