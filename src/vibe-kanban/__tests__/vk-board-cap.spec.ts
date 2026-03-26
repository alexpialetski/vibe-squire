import {
  isKanbanIssueDoneForBoardCount,
  vkListRowCountsTowardBoardCap,
} from '../vk-board-cap';
import { VIBE_SQUIRE_TITLE_MARKER } from '../vk-mcp-list-get-issue-response.schema';

describe('vk-board-cap', () => {
  it('isKanbanIssueDoneForBoardCount matches configured done status', () => {
    expect(isKanbanIssueDoneForBoardCount('Done', 'Done')).toBe(true);
    expect(isKanbanIssueDoneForBoardCount('done', 'Done')).toBe(true);
    expect(isKanbanIssueDoneForBoardCount('In progress', 'Done')).toBe(false);
  });

  it('vkListRowCountsTowardBoardCap requires marker and not done', () => {
    expect(
      vkListRowCountsTowardBoardCap(
        { title: `${VIBE_SQUIRE_TITLE_MARKER} PR #1`, status: 'Backlog' },
        'Done',
      ),
    ).toBe(true);
    expect(
      vkListRowCountsTowardBoardCap(
        { title: `${VIBE_SQUIRE_TITLE_MARKER} PR #1`, status: 'Done' },
        'Done',
      ),
    ).toBe(false);
    expect(
      vkListRowCountsTowardBoardCap(
        { title: 'no marker', status: 'Backlog' },
        'Done',
      ),
    ).toBe(false);
  });
});
