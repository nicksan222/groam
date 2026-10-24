import { formatDiffValue, formatVisualValue } from '@/features/trips/hooks/version-format';
import type { VisualDiffField } from './proposal-types';

export function VisualValue({
  format,
  value
}: {
  format: VisualDiffField['format'];
  value: unknown;
}) {
  const formatted = formatDiffValue(format, value);
  if (formatted !== null) return <span className="break-words">{formatted}</span>;
  if (value === undefined || value === null || value === '') {
    return <span>Not set</span>;
  }
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'string' || typeof value === 'number') {
    return <span className="break-words">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <span className="break-words">
        {value.length ? value.map(formatVisualValue).join(', ') : 'None'}
      </span>
    );
  }
  return <span className="break-words">{formatVisualValue(value)}</span>;
}
