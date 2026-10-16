import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import type { IssueCondition, IssueStatus } from '@/types/issues';

/**
 * Why a hand-made status change is refused, or `null` when it is fine. An issue with an auto
 * condition is closed exactly while the trip meets it, so people cannot close it unmet or
 * reopen it met.
 */
export function statusChangeRefusal(
  condition: IssueCondition | null,
  from: IssueStatus,
  to: IssueStatus
): string | null {
  if (condition?.kind !== 'auto' || from === to) return null;
  return condition.met || isResolved(to) ? condition.refusal : null;
}
