import { reconcileRemovedSyncRows } from '../reconcile-removed-sync-rows';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { DestinationBoardPort } from '../../../ports/destination-board.port';

describe('reconcileRemovedSyncRows', () => {
  it('updates non-terminal issue and deletes row when PR URL not in current scout set', async () => {
    const row = {
      id: 'row-1',
      prUrl: 'https://github.com/o/r/pull/9',
      prNumber: 9,
      kanbanIssueId: 'issue-9',
    };
    const findMany = jest.fn().mockResolvedValue([row]);
    const deleteMany = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      syncedPullRequest: {
        findMany,
        delete: deleteMany,
      },
    } as unknown as PrismaService;

    const getIssue = jest
      .fn()
      .mockResolvedValue({ id: 'issue-9', status: 'Open' });
    const updateIssueStatus = jest.fn().mockResolvedValue(undefined);
    const destinationBoard = {
      getIssue,
      updateIssueStatus,
    } as Pick<DestinationBoardPort, 'getIssue' | 'updateIssueStatus'>;

    await reconcileRemovedSyncRows({
      prisma,
      destinationBoard,
      urlsNow: new Set<string>(),
      kanbanDoneStatus: () => 'Done',
      warn: jest.fn(),
    });

    expect(getIssue).toHaveBeenCalledWith('issue-9');
    expect(updateIssueStatus).toHaveBeenCalledWith('issue-9', 'Done');
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'row-1' } });
  });

  it('skips rows still present in urlsNow', async () => {
    const row = {
      id: 'r',
      prUrl: 'https://github.com/o/r/pull/1',
      prNumber: 1,
      kanbanIssueId: 'i1',
    };
    const deleteMany = jest.fn();
    const prisma = {
      syncedPullRequest: {
        findMany: jest.fn().mockResolvedValue([row]),
        delete: deleteMany,
      },
    } as unknown as PrismaService;

    await reconcileRemovedSyncRows({
      prisma,
      destinationBoard: {
        getIssue: jest.fn(),
        updateIssueStatus: jest.fn(),
      } as Pick<DestinationBoardPort, 'getIssue' | 'updateIssueStatus'>,
      urlsNow: new Set([row.prUrl]),
      kanbanDoneStatus: () => 'Done',
      warn: jest.fn(),
    });

    expect(deleteMany).not.toHaveBeenCalled();
  });
});
