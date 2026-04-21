function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

export function formatIsoDateTime(value: string): string {
  const parsed = new Date(value);
  if (!isValidDate(parsed)) {
    return value;
  }

  const parts = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parsed);

  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;
}
