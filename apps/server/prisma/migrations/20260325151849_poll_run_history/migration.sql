-- CreateTable
CREATE TABLE "PollRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "trigger" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "abortReason" TEXT,
    "errorMessage" TEXT,
    "candidatesCount" INTEGER,
    "issuesCreated" INTEGER,
    "skippedUnmapped" INTEGER,
    "skippedBot" INTEGER,
    "skippedAlreadyTracked" INTEGER,
    "skippedLinkedExisting" INTEGER
);

-- CreateTable
CREATE TABLE "PollRunItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "prUrl" TEXT NOT NULL,
    "githubRepo" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prTitle" TEXT NOT NULL,
    "authorLogin" TEXT,
    "decision" TEXT NOT NULL,
    "detail" TEXT,
    "kanbanIssueId" TEXT,
    CONSTRAINT "PollRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PollRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PollRun_startedAt_idx" ON "PollRun"("startedAt" DESC);

-- CreateIndex
CREATE INDEX "PollRunItem_runId_idx" ON "PollRunItem"("runId");
