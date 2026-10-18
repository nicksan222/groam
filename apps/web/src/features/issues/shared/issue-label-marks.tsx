import type { IssueLabel } from '@/types/issues';
import { cardChip, cardChipTone } from './card-style';

const labelText: Record<IssueLabel, string> = { mandatory: 'Mandatory' };

/** Labels as warning-toned chips for a card's chip row. */
export function IssueLabelMarks({ labels }: { labels: readonly IssueLabel[] }) {
  return labels.map((label) => (
    <span className={`${cardChip} ${cardChipTone.warning}`} key={label}>
      {labelText[label]}
    </span>
  ));
}
