import { cn } from '@groam/ui/lib/utils';
import { isSystemChecked } from '@/features/issues/issue-condition-rules';
import { IssueConditionIcon } from '@/features/issues/shared/issue-condition-icon';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition } from '@/types/issues';
import { IssueRuleBreakdown } from './issue-rule-breakdown';

/** A condition's label and, for anything the system checks, whether the shared trip meets it. */
export function IssueConditionSummary({ condition }: { condition: IssueCondition }) {
  const checked = isSystemChecked(condition);
  return (
    <div
      className="space-y-2"
      data-met={condition.met ?? undefined}
      data-testid={testIds.issueConditionPanel}
    >
      <p className="flex items-start gap-2 text-sm font-medium">
        <IssueConditionIcon
          className={cn(
            'mt-1 size-4 shrink-0',
            condition.met ? 'text-success-foreground' : 'text-muted-foreground'
          )}
          manual={!checked}
          met={condition.met}
        />
        <span className="min-w-0">{condition.label}</span>
      </p>
      {condition.kind === 'rule' ? <IssueRuleBreakdown rule={condition} /> : null}
      {checked ? (
        <p className="text-xs text-muted-foreground">
          {condition.met
            ? 'Met. It stays Done until the shared trip changes.'
            : 'Not met yet. Closes automatically when the trip changes; start an idea to get there.'}
        </p>
      ) : null}
    </div>
  );
}
