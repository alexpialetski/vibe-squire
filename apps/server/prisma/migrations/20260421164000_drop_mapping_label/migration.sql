-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RepoProjectMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubRepo" TEXT NOT NULL,
    "vibeKanbanRepoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RepoProjectMapping" ("createdAt", "githubRepo", "id", "updatedAt", "vibeKanbanRepoId") SELECT "createdAt", "githubRepo", "id", "updatedAt", "vibeKanbanRepoId" FROM "RepoProjectMapping";
DROP TABLE "RepoProjectMapping";
ALTER TABLE "new_RepoProjectMapping" RENAME TO "RepoProjectMapping";
CREATE UNIQUE INDEX "RepoProjectMapping_githubRepo_key" ON "RepoProjectMapping"("githubRepo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
