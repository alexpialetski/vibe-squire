import type { MappingGqlRow } from '../../graphql/operator-query-types';
import { MappingEditableRow } from '../molecules/MappingEditableRow';

type VkRepoOption = { id: string; name?: string };

type MappingsTableProps = {
  rows: MappingGqlRow[];
  vkRepos: VkRepoOption[];
  listInitialLoading: boolean;
  listErrorMessage: string | null;
  showEmptyHint: boolean;
  editingId: string | null;
  draft: Partial<MappingGqlRow>;
  deleteBusy: boolean;
  onDraftChange: (patch: Partial<MappingGqlRow>) => void;
  onStartEdit: (row: MappingGqlRow) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onRequestDelete: (id: string) => void;
};

export function MappingsTable({
  rows,
  vkRepos,
  listInitialLoading,
  listErrorMessage,
  showEmptyHint,
  editingId,
  draft,
  deleteBusy,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRequestDelete,
}: MappingsTableProps) {
  return (
    <section className="card mappings-existing-card">
      <h2>Existing</h2>
      {listInitialLoading ? <p className="muted">Loading mappings…</p> : null}
      {listErrorMessage ? (
        <p className="text-danger">
          Failed to load mappings: {listErrorMessage}
        </p>
      ) : null}
      {showEmptyHint ? (
        <p className="muted">
          No mappings yet. Add one above to route GitHub PRs to a Kanban
          repository.
        </p>
      ) : null}
      {rows.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>GitHub repo</th>
              <th>Kanban repo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <MappingEditableRow
                key={row.id}
                row={row}
                vkRepos={vkRepos}
                isEditing={editingId === row.id}
                draft={draft}
                deleteBusy={deleteBusy}
                onDraftChange={onDraftChange}
                onStartEdit={() => onStartEdit(row)}
                onCancelEdit={onCancelEdit}
                onSave={() => onSaveEdit(row.id)}
                onRequestDelete={() => {
                  if (confirm('Delete this mapping?')) {
                    onRequestDelete(row.id);
                  }
                }}
              />
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
