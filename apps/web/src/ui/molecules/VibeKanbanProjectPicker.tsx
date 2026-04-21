type VibeKanbanProjectOption = {
  id: string;
  name?: string | null;
};

type VibeKanbanProjectPickerProps = {
  value: string;
  options: VibeKanbanProjectOption[];
  loading: boolean;
  errorMessage: string | null;
  onChange: (value: string) => void;
};

export function VibeKanbanProjectPicker({
  value,
  options,
  loading,
  errorMessage,
  onChange,
}: VibeKanbanProjectPickerProps) {
  return (
    <label className="field">
      <span className="field-label">Project</span>
      <select
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
      >
        <option value="">
          {loading && options.length === 0 ? 'Loading…' : 'Select…'}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name ?? option.id}
          </option>
        ))}
      </select>
      {errorMessage ? <p className="text-danger">{errorMessage}</p> : null}
    </label>
  );
}
