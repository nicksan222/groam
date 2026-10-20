import { cardChip, cardChipTone } from '@groam/ui/lib/board-card';
import type { IssueLabel } from '@/types/issues';

const labelText: Record<IssueLabel, string> = { mandatory: 'Mandatory' };

/** Labels as warning-toned chips for a card's chip row. */
export function IssueLabelMarks({ labels }: { labels: readonly IssueLabel[] }) {
  return labels.map((label) => (
    <span className={`${cardChip} ${cardChipTone.warning}`} key={label}>
      {labelText[label]}
    </span>
  ));
}
