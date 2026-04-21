import { VibeKanbanBoardPicker } from '../molecules/VibeKanbanBoardPicker';
import { VibeKanbanExecutorSelect } from '../molecules/VibeKanbanExecutorSelect';
import { VibeKanbanProjectPicker } from '../molecules/VibeKanbanProjectPicker';

type OrgOption = {
  id: string;
  name?: string | null;
};

type ProjectOption = {
  id: string;
  name?: string | null;
};

type ExecutorOption = {
  value: string;
  label: string;
};

type VibeKanbanSettingsFormProps = {
  orgLabel: string;
  doneStatusLabel: string;
  executorLabel: string;
  boardPickerEnabled: boolean;
  orgErrorMessage: string | null;
  orgOptions: OrgOption[];
  orgLoading: boolean;
  selectedOrgId: string;
  onOrgChange: (value: string) => void;
  selectedProjectId: string;
  projectOptions: ProjectOption[];
  projectLoading: boolean;
  projectErrorMessage: string | null;
  onProjectChange: (value: string) => void;
  doneStatusValue: string;
  onDoneStatusChange: (value: string) => void;
  executorValue: string;
  executorOptions: ExecutorOption[];
  onExecutorChange: (value: string) => void;
  saving: boolean;
  onSubmit: () => void;
};

export function VibeKanbanSettingsForm({
  orgLabel,
  doneStatusLabel,
  executorLabel,
  boardPickerEnabled,
  orgErrorMessage,
  orgOptions,
  orgLoading,
  selectedOrgId,
  onOrgChange,
  selectedProjectId,
  projectOptions,
  projectLoading,
  projectErrorMessage,
  onProjectChange,
  doneStatusValue,
  onDoneStatusChange,
  executorValue,
  executorOptions,
  onExecutorChange,
  saving,
  onSubmit,
}: VibeKanbanSettingsFormProps) {
  const orgSelectDisabled =
    !boardPickerEnabled ||
    Boolean(orgErrorMessage) ||
    (orgLoading && orgOptions.length === 0);

  return (
    <section className="card">
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <VibeKanbanBoardPicker
          label={orgLabel}
          value={selectedOrgId}
          options={orgOptions}
          disabled={orgSelectDisabled}
          loading={orgLoading}
          hasOrgError={Boolean(orgErrorMessage)}
          onChange={onOrgChange}
        />

        {selectedOrgId.trim() ? (
          <>
            <VibeKanbanProjectPicker
              value={selectedProjectId}
              options={projectOptions}
              loading={projectLoading}
              errorMessage={projectErrorMessage}
              onChange={onProjectChange}
            />
            <label className="field">
              <span className="field-label">{doneStatusLabel}</span>
              <input
                className="input"
                value={doneStatusValue}
                onChange={(event) => onDoneStatusChange(event.target.value)}
              />
            </label>
            <VibeKanbanExecutorSelect
              label={executorLabel}
              value={executorValue}
              options={executorOptions}
              onChange={onExecutorChange}
            />
          </>
        ) : null}

        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </section>
  );
}
