-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScoutState" (
    "scoutId" TEXT NOT NULL PRIMARY KEY,
    "lastPollAt" DATETIME,
    "nextPollAt" DATETIME,
    "lastError" TEXT,
    "failureStreak" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ScoutState" ("lastError", "lastPollAt", "nextPollAt", "scoutId", "updatedAt") SELECT "lastError", "lastPollAt", "nextPollAt", "scoutId", "updatedAt" FROM "ScoutState";
DROP TABLE "ScoutState";
ALTER TABLE "new_ScoutState" RENAME TO "ScoutState";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
