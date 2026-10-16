import { cn } from '@groam/ui/lib/utils';
import { CircleCheck, Flag } from 'lucide-react';
import type { IssueCondition } from '@/types/issues';
import { cardChip, cardChipTone } from './card-style';

const pendingWording = {
  activities: 'Needs an activity everywhere',
  budget: 'Needs a group budget',
  dates: 'Needs travel dates',
  destination: 'Needs a destination',
  duration: 'Needs a trip length',
  packing: 'Needs a packing list',
  stays: 'Needs a stay every night'
} satisfies Record<Extract<IssueCondition, { kind: 'auto' }>['check'], string>;

/**
 * What closes the issue, as a chip: short wording while an automatic check is pending, the label
 * once it is met, and a flag or a check to say which. The full label is the tooltip.
 */
export function IssueConditionLine({
  className,
  condition
}: {
  className?: string;
  condition: IssueCondition;
}) {
  const Icon = condition.met ? CircleCheck : Flag;
  const text =
    condition.kind === 'auto' && !condition.met ? pendingWording[condition.check] : condition.label;
  return (
    <span
      className={cn(cardChip, condition.met && cardChipTone.success, className)}
      data-met={condition.met ?? undefined}
      title={`Done when: ${condition.label}`}
    >
      <Icon aria-hidden className="size-3 shrink-0" />
      <span className="truncate">{text}</span>
      <span className="sr-only">{condition.met ? ' (met)' : ' (not yet)'}</span>
    </span>
  );
}
