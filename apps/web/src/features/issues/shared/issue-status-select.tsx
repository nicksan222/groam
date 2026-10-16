import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { statusChangeRefusal } from '@/features/issues/issue-condition-rules';
import { ISSUE_STATUSES, issueStatusMeta } from '@/features/issues/issue-status';
import { IssueStatusBadge } from '@/features/issues/shared/issue-status-badge';
import { IssueStatusIcon } from '@/features/issues/shared/issue-status-icon';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition, IssueStatus } from '@/types/issues';

/**
 * Changes an issue's lifecycle status. Renders the plain badge when the viewer cannot manage the
 * issue, so callers never branch on permission themselves.
 */
export function IssueStatusSelect({
  canManage,
  condition = null,
  disabled = false,
  onChange,
  status
}: {
  canManage: boolean;
  /** An auto condition closes the issue itself, so Done and Won't do are not hand-picked while it is unmet, and Done cannot be left while it is met. */
  condition?: IssueCondition | null;
  disabled?: boolean;
  onChange: (status: IssueStatus) => void;
  status: IssueStatus;
}) {
  if (!canManage) return <IssueStatusBadge status={status} testId={testIds.issueStatus} />;
  return (
    <Select
      disabled={disabled}
      onValueChange={(next) => {
        const option = ISSUE_STATUSES.find((candidate) => candidate === next);
        if (option && option !== status) onChange(option);
      }}
      value={status}
    >
      <SelectTrigger
        aria-label="Issue status"
        className="h-7 gap-1.5 px-2 text-xs font-medium shadow-none"
        data-status={status}
        data-testid={testIds.issueStatus}
        size="sm"
      >
        <SelectValue>
          <IssueStatusIcon className="size-3.5" status={status} />
          {issueStatusMeta[status].label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {ISSUE_STATUSES.map((option) => {
          const refusal = statusChangeRefusal(condition, status, option);
          return (
            <SelectItem
              data-status={option}
              data-testid={testIds.issueStatusSelectOption}
              disabled={refusal !== null}
              key={option}
              value={option}
            >
              <IssueStatusIcon status={option} />
              {issueStatusMeta[option].label}
              {refusal ? <span className="text-xs text-muted-foreground">{refusal}</span> : null}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
