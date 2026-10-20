import { CircleCheck, Flag } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@groam/ui/components/tooltip';
import type { IssueCondition } from '@/types/issues';

/** A rule stays in the badge rail; its full condition is available on hover and keyboard focus. */
export function IssueListConditionBadge({ condition }: { condition: IssueCondition }) {
  const Icon = condition.met ? CircleCheck : Flag;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={`Done when: ${condition.label}`}
          className="hidden lg:inline-flex"
          unstyled
        >
          <RecordListBadge className="gap-1.5 font-normal">
            <Icon aria-hidden />
            {condition.kind === 'rule' ? 'Auto-close' : 'Done when'}
          </RecordListBadge>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-left">
        Done when: {condition.label}
        {condition.met ? ' (met)' : ''}
      </TooltipContent>
    </Tooltip>
  );
}
