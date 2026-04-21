type VibeKanbanOrgOption = {
  id: string;
  name?: string | null;
};

type VibeKanbanBoardPickerProps = {
  label: string;
  value: string;
  options: VibeKanbanOrgOption[];
  disabled: boolean;
  loading: boolean;
  hasOrgError: boolean;
  onChange: (value: string) => void;
};

export function VibeKanbanBoardPicker({
  label,
  value,
  options,
  disabled,
  loading,
  hasOrgError,
  onChange,
}: VibeKanbanBoardPickerProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">
          {hasOrgError
            ? '—'
            : loading && options.length === 0
              ? 'Loading…'
              : 'Select…'}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name ?? option.id}
          </option>
        ))}
      </select>
    </label>
  );
}
