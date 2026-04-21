import type { MappingGqlRow } from '../../graphql/operator-query-types';

type VkRepoOption = { id: string; name?: string };

type MappingEditableRowProps = {
  row: MappingGqlRow;
  vkRepos: VkRepoOption[];
  isEditing: boolean;
  draft: Partial<MappingGqlRow>;
  deleteBusy: boolean;
  onDraftChange: (patch: Partial<MappingGqlRow>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onRequestDelete: () => void;
};

export function MappingEditableRow({
  row,
  vkRepos,
  isEditing,
  draft,
  deleteBusy,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onRequestDelete,
}: MappingEditableRowProps) {
  return (
    <tr>
      <td>
        {isEditing ? (
          <input
            className="input"
            value={draft.githubRepo ?? ''}
            onChange={(e) => onDraftChange({ githubRepo: e.target.value })}
          />
        ) : (
          <code>{row.githubRepo}</code>
        )}
      </td>
      <td>
        {isEditing ? (
          <select
            className="input"
            value={draft.vibeKanbanRepoId ?? ''}
            onChange={(e) =>
              onDraftChange({ vibeKanbanRepoId: e.target.value })
            }
          >
            {vkRepos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name ?? r.id}
              </option>
            ))}
          </select>
        ) : (
          <code>{row.vibeKanbanRepoId}</code>
        )}
      </td>
      <td className="table-actions">
        {isEditing ? (
          <>
            <button
              type="button"
              className="btn primary ghost"
              onClick={onSave}
            >
              Save
            </button>
            <button type="button" className="btn ghost" onClick={onCancelEdit}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn ghost" onClick={onStartEdit}>
              Edit
            </button>
            <button
              type="button"
              className="btn danger ghost"
              disabled={deleteBusy}
              onClick={onRequestDelete}
            >
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
