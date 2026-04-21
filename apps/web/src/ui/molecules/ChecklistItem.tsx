type ChecklistItemProps = {
  text: string;
  linkHref?: string;
  linkLabel?: string;
};

export function ChecklistItem({
  text,
  linkHref,
  linkLabel,
}: ChecklistItemProps) {
  return (
    <li className="setup-checklist-item">
      <span className="setup-checklist-mark" aria-hidden>
        •
      </span>
      <span className="setup-checklist-text">
        {text}
        {linkHref && linkLabel && (
          <>
            {' '}
            <a className="setup-checklist-link" href={linkHref}>
              {linkLabel}
            </a>
          </>
        )}
      </span>
    </li>
  );
}
