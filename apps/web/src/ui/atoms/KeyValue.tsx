type KeyValueProps = {
  label: string;
  value: string;
};

export function KeyValue({ label, value }: KeyValueProps) {
  return (
    <div className="ui-key-value">
      <span className="ui-key-value-label">{label}</span>
      <span className="ui-key-value-value">{value}</span>
    </div>
  );
}
