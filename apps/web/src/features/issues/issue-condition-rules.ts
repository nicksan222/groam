import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import type { IssueCondition, IssueStatus } from '@/types/issues';

/** A starter decision: a rule every trip opens with, which cannot be set aside as won't do. */
export function isStarterCondition(condition: IssueCondition | null): boolean {
  return condition?.kind === 'rule' && condition.starter;
}

/** Whether the system, not a person, decides this condition: any rule, starter or composed. */
export function isSystemChecked(condition: IssueCondition): boolean {
  return condition.kind === 'rule';
}

/**
 * Why a hand-made status change is refused, or `null` when it is fine. A rule issue is closed
 * exactly while the trip meets it, so people cannot close it unmet or reopen it met. A person's
 * own rule can still be set aside as won't do, as the server allows; a starter cannot.
 */
export function statusChangeRefusal(
  condition: IssueCondition | null,
  from: IssueStatus,
  to: IssueStatus
): string | null {
  if (condition?.kind !== 'rule' || from === to) return null;
  if (to === 'wont_do') return isStarterCondition(condition) ? condition.refusal : null;
  return isResolved(to) === condition.met ? null : condition.refusal;
}
