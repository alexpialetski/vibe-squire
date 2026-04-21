export type StatusDotState =
  | 'ok'
  | 'error'
  | 'unknown'
  | 'degraded'
  | 'idle'
  | 'running'
  | 'skipped';

const stateToColor: Record<StatusDotState, string> = {
  ok: 'var(--accent)',
  degraded: 'var(--warn)',
  error: 'var(--danger)',
  unknown: '#5a6b62',
  idle: '#5a6b62',
  running: 'var(--warn)',
  skipped: '#5a6b62',
};

type StatusDotProps = {
  state: StatusDotState;
};

export function StatusDot({ state }: StatusDotProps) {
  return (
    <span
      className="status-dot"
      aria-label={`State: ${state}`}
      title={state}
      style={{ backgroundColor: stateToColor[state] }}
    />
  );
}
