type ActivityTriageActionsProps = {
  prUrl: string;
  onAccept: (prUrl: string) => void;
  onDecline: (prUrl: string) => void;
  onReconsider: (prUrl: string) => void;
};

export function ActivityTriageActions({
  prUrl,
  onAccept,
  onDecline,
  onReconsider,
}: ActivityTriageActionsProps) {
  return (
    <div className="actions">
      <button
        type="button"
        className="btn primary ghost"
        onClick={() => onAccept(prUrl)}
      >
        Review
      </button>
      <button
        type="button"
        className="btn ghost"
        onClick={() => onDecline(prUrl)}
      >
        Decline
      </button>
      <button
        type="button"
        className="btn ghost"
        onClick={() => onReconsider(prUrl)}
      >
        Reconsider
      </button>
    </div>
  );
}
