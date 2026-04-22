type ActivityTriageActionsProps = {
  prUrl: string;
  mode: 'pending' | 'declined';
  /** This row is waiting on accept / decline / reconsider. */
  actionPending: boolean;
  onAccept: (prUrl: string) => void;
  onDecline: (prUrl: string) => void;
  onReconsider: (prUrl: string) => void;
};

export function ActivityTriageActions({
  prUrl,
  mode,
  actionPending,
  onAccept,
  onDecline,
  onReconsider,
}: ActivityTriageActionsProps) {
  if (actionPending) {
    return (
      <div className="triage-actions triage-actions--pending">
        <span className="triage-actions__pending" aria-live="polite">
          <span className="triage-action-spinner" aria-hidden />
          <span>Working…</span>
        </span>
      </div>
    );
  }

  return (
    <div className="triage-actions">
      {mode === 'pending' ? (
        <>
          <button
            type="button"
            className="btn btn-sm primary"
            onClick={() => onAccept(prUrl)}
          >
            Review
          </button>
          <button
            type="button"
            className="btn btn-sm ghost"
            onClick={() => onDecline(prUrl)}
          >
            Decline
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-sm ghost"
          onClick={() => onReconsider(prUrl)}
        >
          Reconsider
        </button>
      )}
    </div>
  );
}
