import { chip, chipTone } from '@groam/ui/lib/chip';
import type { IssueLabel } from '@/types/issues';

const labelText: Record<IssueLabel, string> = { mandatory: 'Mandatory' };

/** Labels as warning-toned chips for a card's chip row. */
export function IssueLabelMarks({ labels }: { labels: readonly IssueLabel[] }) {
  return labels.map((label) => (
    <span className={`${chip} ${chipTone.warning}`} key={label}>
      {labelText[label]}
    </span>
  ));
}
