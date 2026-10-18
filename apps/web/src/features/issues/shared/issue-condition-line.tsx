import { cn } from '@groam/ui/lib/utils';
import type { IssueCondition } from '@/types/issues';
import { cardChip, cardChipTone } from './card-style';
import { IssueConditionIcon } from './issue-condition-icon';

/** While a one-clause rule is unmet, its detail ("No destination yet") says what is missing. */
function chipText(condition: IssueCondition): string {
  if (condition.kind !== 'rule' || condition.met) return condition.label;
  const [only, ...rest] = condition.items;
  return only?.kind === 'clause' && rest.length === 0 && only.detail
    ? only.detail
    : condition.label;
}

/**
 * What closes the issue, as a chip: what is missing while a one-clause rule is pending, the label
 * once it is met, and a flag, a check, or a pen (written by hand) to say which. The full label is
 * the tooltip.
 */
export function IssueConditionLine({
  className,
  condition
}: {
  className?: string;
  condition: IssueCondition;
}) {
  const text = chipText(condition);
  return (
    <span
      className={cn(cardChip, condition.met && cardChipTone.success, className)}
      data-met={condition.met ?? undefined}
      title={`Done when: ${condition.label}`}
    >
      <IssueConditionIcon
        className="size-3 shrink-0"
        manual={condition.kind === 'manual'}
        met={condition.met}
      />
      <span className="truncate">{text}</span>
      <span className="sr-only">{condition.met ? ' (met)' : ' (not yet)'}</span>
    </span>
  );
}
