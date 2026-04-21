type ExecutorOption = {
  value: string;
  label: string;
};

type VibeKanbanExecutorSelectProps = {
  label: string;
  value: string;
  options: ExecutorOption[];
  onChange: (value: string) => void;
};

export function VibeKanbanExecutorSelect({
  label,
  value,
  options,
  onChange,
}: VibeKanbanExecutorSelectProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
