import { StatusDot, type StatusDotState } from '../atoms/StatusDot';

type StatusPillProps = {
  state: StatusDotState;
  label?: string;
};

export function StatusPill({ state, label }: StatusPillProps) {
  return (
    <span className="ui-status-pill">
      <StatusDot state={state} />
      <span>{label ?? state}</span>
    </span>
  );
}
