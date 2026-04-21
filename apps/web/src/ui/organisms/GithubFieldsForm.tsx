type GithubField = {
  key: string;
  label: string;
  value: string;
};

type GithubFieldsFormProps = {
  fields: GithubField[];
  values: Record<string, string>;
  saving: boolean;
  onValueChange: (key: string, value: string) => void;
  onSubmit: () => void;
};

export function GithubFieldsForm({
  fields,
  values,
  saving,
  onValueChange,
  onSubmit,
}: GithubFieldsFormProps) {
  return (
    <section className="card">
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {fields.map((field) => (
          <label key={field.key} className="field">
            <span className="field-label">{field.label}</span>
            <textarea
              className="input"
              rows={3}
              value={values[field.key] ?? ''}
              onChange={(event) => onValueChange(field.key, event.target.value)}
            />
          </label>
        ))}
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </section>
  );
}
