import type { MappingGqlRow } from '../../graphql/operator-query-types';
import { MappingEditableRow } from '../molecules/MappingEditableRow';

type MappingsTableProps = {
  rows: MappingGqlRow[];
  listInitialLoading: boolean;
  listErrorMessage: string | null;
  showEmptyHint: boolean;
  deleteBusy: boolean;
  onRequestDelete: (id: string) => void;
};

export function MappingsTable({
  rows,
  listInitialLoading,
  listErrorMessage,
  showEmptyHint,
  deleteBusy,
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
                deleteBusy={deleteBusy}
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
