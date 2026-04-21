type VkRepoOption = {
  id: string;
  name?: string;
};

type VibeKanbanRepoPickerProps = {
  value: string;
  options: VkRepoOption[];
  loading: boolean;
  onChange: (value: string) => void;
};

export function VibeKanbanRepoPicker({
  value,
  options,
  loading,
  onChange,
}: VibeKanbanRepoPickerProps) {
  return (
    <label className="field">
      <span className="field-label">Kanban repository</span>
      <select
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading…' : 'Select…'}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name ?? option.id}
          </option>
        ))}
      </select>
    </label>
  );
}
