import type { CoreSettingFieldRow } from '../../graphql/operator-query-types';
import { Switcher } from '../atoms/Switcher';

type GeneralSettingsFormProps = {
  loading: boolean;
  errorMessage: string | null;
  scheduledOn: boolean;
  autoCreate: boolean;
  onScheduledChange: (v: boolean) => void;
  onAutoCreateChange: (v: boolean) => void;
  textFields: CoreSettingFieldRow[];
  texts: Record<string, string>;
  onTextChange: (key: string, value: string) => void;
  saving: boolean;
  onSubmit: () => void;
};

export function GeneralSettingsForm({
  loading,
  errorMessage,
  scheduledOn,
  autoCreate,
  onScheduledChange,
  onAutoCreateChange,
  textFields,
  texts,
  onTextChange,
  saving,
  onSubmit,
}: GeneralSettingsFormProps) {
  return (
    <section className="card">
      <h2>Kanban issue creation</h2>
      {loading ? <p className="muted">Loading…</p> : null}
      {errorMessage ? (
        <p className="text-danger">Failed to load settings: {errorMessage}</p>
      ) : null}
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Switcher
          checked={scheduledOn}
          onChange={onScheduledChange}
          label="Enable scheduled sync"
          settingKey="scheduled_sync_enabled"
        />
        <Switcher
          checked={autoCreate}
          onChange={onAutoCreateChange}
          label="Auto-create issues from sync"
          settingKey="auto_create_issues"
        />
        {textFields.map((f) => (
          <label key={f.key} className="field">
            <span className="field-label">{f.label}</span>
            <p className="muted setting-field-meta">
              <code>{f.key}</code>
              {f.envVar ? (
                <>
                  {' '}
                  · env <code>{f.envVar}</code>
                </>
              ) : null}
            </p>
            {f.description ? (
              <p className="muted setting-field-desc">{f.description}</p>
            ) : null}
            <input
              className="input"
              name={f.key}
              value={texts[f.key] ?? ''}
              onChange={(ev) => onTextChange(f.key, ev.target.value)}
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
