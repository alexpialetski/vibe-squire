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
