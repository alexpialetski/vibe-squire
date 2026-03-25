-- AlterTable
ALTER TABLE "ScoutState" ADD COLUMN "lastPollCandidatesCount" INTEGER;
ALTER TABLE "ScoutState" ADD COLUMN "lastPollIssuesCreated" INTEGER;
ALTER TABLE "ScoutState" ADD COLUMN "lastPollSkippedUnmapped" INTEGER;
