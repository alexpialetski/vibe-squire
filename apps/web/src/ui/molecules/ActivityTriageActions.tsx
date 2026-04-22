/** Shown while accept / decline / reconsider is in flight (incl. after optimistic accept). */
export function TriageActionInFlight() {
  return (
    <div className="triage-actions triage-actions--pending">
      <span className="triage-actions__pending" aria-live="polite">
        <span className="triage-action-spinner" aria-hidden />
        <span>Working…</span>
      </span>
    </div>
  );
}

type ActivityTriageActionsProps = {
  prUrl: string;
  mode: 'pending' | 'declined';
  onAccept: (prUrl: string) => void;
  onDecline: (prUrl: string) => void;
  onReconsider: (prUrl: string) => void;
};

export function ActivityTriageActions({
  prUrl,
  mode,
  onAccept,
  onDecline,
  onReconsider,
}: ActivityTriageActionsProps) {
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
