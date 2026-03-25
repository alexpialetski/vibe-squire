/*
  Warnings:

  - You are about to drop the column `kanbanOrganizationId` on the `RepoProjectMapping` table. All the data in the column will be lost.
  - You are about to drop the column `kanbanProjectId` on the `RepoProjectMapping` table. All the data in the column will be lost.
  - Added the required column `vibeKanbanRepoId` to the `RepoProjectMapping` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SyncedPullRequest" ADD COLUMN "vibeKanbanWorkspaceId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RepoProjectMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubRepo" TEXT NOT NULL,
    "vibeKanbanRepoId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RepoProjectMapping" ("createdAt", "githubRepo", "id", "label", "updatedAt", "vibeKanbanRepoId") SELECT "createdAt", "githubRepo", "id", "label", "updatedAt", '00000000-0000-4000-8000-000000000000' FROM "RepoProjectMapping";
DROP TABLE "RepoProjectMapping";
ALTER TABLE "new_RepoProjectMapping" RENAME TO "RepoProjectMapping";
CREATE UNIQUE INDEX "RepoProjectMapping_githubRepo_key" ON "RepoProjectMapping"("githubRepo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
