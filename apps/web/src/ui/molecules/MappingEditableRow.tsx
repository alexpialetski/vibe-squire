import type { MappingGqlRow } from '../../graphql/operator-query-types';

type MappingEditableRowProps = {
  row: MappingGqlRow;
  deleteBusy: boolean;
  onRequestDelete: () => void;
};

export function MappingEditableRow({
  row,
  deleteBusy,
  onRequestDelete,
}: MappingEditableRowProps) {
  return (
    <tr>
      <td>
        <code>{row.githubRepo}</code>
      </td>
      <td>
        <code>{row.vibeKanbanRepoId}</code>
      </td>
      <td className="table-actions">
        <button
          type="button"
          className="btn danger ghost"
          disabled={deleteBusy}
          onClick={onRequestDelete}
        >
          {deleteBusy ? 'Deleting…' : 'Delete'}
        </button>
      </td>
    </tr>
  );
}
