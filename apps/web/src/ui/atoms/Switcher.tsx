type SwitcherProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  settingKey?: string;
  disabled?: boolean;
};

export function Switcher({
  checked,
  onChange,
  label,
  settingKey,
  disabled = false,
}: SwitcherProps) {
  return (
    <label className="ui-switcher">
      <span className="ui-switcher-copy">
        <span>{label}</span>
        {settingKey ? <span className="field-key">{settingKey}</span> : null}
      </span>
      <input
        className="ui-switcher-input"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ui-switcher-track" aria-hidden>
        <span className="ui-switcher-thumb" />
      </span>
    </label>
  );
}
