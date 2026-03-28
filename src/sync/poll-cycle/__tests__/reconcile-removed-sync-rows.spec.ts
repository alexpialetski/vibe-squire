import { reconcileRemovedSyncRows } from '../reconcile-removed-sync-rows';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { DestinationBoardPort } from '../../../ports/destination-board.port';

type ReconcileBoardDeps = Pick<
  DestinationBoardPort,
  'getIssue' | 'updateIssueStatus' | 'deleteWorkspace'
>;

describe('reconcileRemovedSyncRows', () => {
  it('updates non-terminal issue and deletes row when PR URL not in current scout set', async () => {
    const row = {
      id: 'row-1',
      prUrl: 'https://github.com/o/r/pull/9',
      prNumber: 9,
      kanbanIssueId: 'issue-9',
      vibeKanbanWorkspaceId: null,
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
    const destinationBoard: ReconcileBoardDeps = {
      getIssue,
      updateIssueStatus,
    };

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
      vibeKanbanWorkspaceId: null,
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
      } as ReconcileBoardDeps,
      urlsNow: new Set([row.prUrl]),
      kanbanDoneStatus: () => 'Done',
      warn: jest.fn(),
    });

    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('calls deleteWorkspace with deleteBranches when workspace id is present', async () => {
    const row = {
      id: 'row-2',
      prUrl: 'https://github.com/o/r/pull/42',
      prNumber: 42,
      kanbanIssueId: 'issue-42',
      vibeKanbanWorkspaceId: 'ws-abc',
    };
    const prisma = {
      syncedPullRequest: {
        findMany: jest.fn().mockResolvedValue([row]),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    } as unknown as PrismaService;

    const deleteWorkspace = jest.fn().mockResolvedValue(undefined);
    const destinationBoard: ReconcileBoardDeps = {
      getIssue: jest.fn().mockResolvedValue({ id: 'issue-42', status: 'Done' }),
      updateIssueStatus: jest.fn(),
      deleteWorkspace,
    };

    await reconcileRemovedSyncRows({
      prisma,
      destinationBoard,
      urlsNow: new Set<string>(),
      kanbanDoneStatus: () => 'Done',
      warn: jest.fn(),
    });

    expect(deleteWorkspace).toHaveBeenCalledWith('ws-abc', {
      deleteBranches: true,
    });
  });

  it('does not call deleteWorkspace when workspace id is null', async () => {
    const row = {
      id: 'row-3',
      prUrl: 'https://github.com/o/r/pull/7',
      prNumber: 7,
      kanbanIssueId: 'issue-7',
      vibeKanbanWorkspaceId: null,
    };
    const prisma = {
      syncedPullRequest: {
        findMany: jest.fn().mockResolvedValue([row]),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    } as unknown as PrismaService;

    const deleteWorkspace = jest.fn();
    const destinationBoard: ReconcileBoardDeps = {
      getIssue: jest.fn().mockResolvedValue({ id: 'issue-7', status: 'Open' }),
      updateIssueStatus: jest.fn().mockResolvedValue(undefined),
      deleteWorkspace,
    };

    await reconcileRemovedSyncRows({
      prisma,
      destinationBoard,
      urlsNow: new Set<string>(),
      kanbanDoneStatus: () => 'Done',
      warn: jest.fn(),
    });

    expect(deleteWorkspace).not.toHaveBeenCalled();
  });

  it('warns but still deletes sync row when deleteWorkspace fails', async () => {
    const row = {
      id: 'row-4',
      prUrl: 'https://github.com/o/r/pull/13',
      prNumber: 13,
      kanbanIssueId: 'issue-13',
      vibeKanbanWorkspaceId: 'ws-fail',
    };
    const deleteFn = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      syncedPullRequest: {
        findMany: jest.fn().mockResolvedValue([row]),
        delete: deleteFn,
      },
    } as unknown as PrismaService;

    const deleteWorkspace = jest
      .fn()
      .mockRejectedValue(new Error('workspace gone'));
    const warn = jest.fn();
    const destinationBoard: ReconcileBoardDeps = {
      getIssue: jest.fn().mockResolvedValue({ id: 'issue-13', status: 'Done' }),
      updateIssueStatus: jest.fn(),
      deleteWorkspace,
    };

    await reconcileRemovedSyncRows({
      prisma,
      destinationBoard,
      urlsNow: new Set<string>(),
      kanbanDoneStatus: () => 'Done',
      warn,
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('delete_workspace'),
    );
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 'row-4' } });
  });
});
