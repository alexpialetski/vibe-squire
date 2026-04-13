-- CreateTable
CREATE TABLE "SyncedPullRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubRepo" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prUrl" TEXT NOT NULL,
    "kanbanIssueId" TEXT NOT NULL,
    "kanbanProjectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncedPullRequest_prUrl_key" ON "SyncedPullRequest"("prUrl");

-- CreateIndex
CREATE INDEX "SyncedPullRequest_githubRepo_idx" ON "SyncedPullRequest"("githubRepo");

-- CreateIndex
CREATE INDEX "SyncedPullRequest_kanbanProjectId_idx" ON "SyncedPullRequest"("kanbanProjectId");
