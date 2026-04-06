-- CreateTable
CREATE TABLE "DeclinedPullRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prUrl" TEXT NOT NULL,
    "declinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DeclinedPullRequest_prUrl_key" ON "DeclinedPullRequest"("prUrl");

-- AlterTable: add triage counters to PollRun
ALTER TABLE "PollRun" ADD COLUMN "skippedTriage" INTEGER;
ALTER TABLE "PollRun" ADD COLUMN "skippedDeclined" INTEGER;
