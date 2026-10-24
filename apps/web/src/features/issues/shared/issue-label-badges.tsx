import { Badge } from '@groam/ui/components/badge';
import type { IssueLabel } from '@/types/issues';

const labelText: Record<IssueLabel, string> = { mandatory: 'Mandatory' };

/** A wrapping row of label badges, such as Mandatory; renders nothing when there are no labels. */
export function IssueLabelBadges({ labels }: { labels: readonly IssueLabel[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <Badge key={label} variant="amber">
          {labelText[label]}
        </Badge>
      ))}
    </div>
  );
}
