-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RepoProjectMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubRepo" TEXT NOT NULL,
    "kanbanProjectId" TEXT NOT NULL,
    "kanbanOrganizationId" TEXT,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScoutState" (
    "scoutId" TEXT NOT NULL PRIMARY KEY,
    "lastPollAt" DATETIME,
    "nextPollAt" DATETIME,
    "lastError" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RepoProjectMapping_githubRepo_key" ON "RepoProjectMapping"("githubRepo");
