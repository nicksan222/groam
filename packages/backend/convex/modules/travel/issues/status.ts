/**
 * Issue lifecycle, shared by the issues module and its consumers.
 *
 * - `open`: to decide
 * - `in_progress`: someone is handling it
 * - `closed`: done or settled
 * - `wont_do`: discarded
 *
 * Pure so modules that the issues module imports (assistant runs, versions) can use it without a
 * dependency cycle.
 */
export type TripIssueStatus = 'open' | 'in_progress' | 'closed' | 'wont_do';

/** Finished: the issue no longer needs anyone's attention. */
export function isResolved(status: TripIssueStatus): boolean {
  return status === 'closed' || status === 'wont_do';
}

/** System-comment text for a status change, written after the actor's name. */
export function statusChangeMessage(to: TripIssueStatus): string {
  switch (to) {
    case 'in_progress': {
      return 'started working on this';
    }
    case 'closed': {
      return 'closed this';
    }
    case 'wont_do': {
      return "marked this as won't do";
    }
    case 'open': {
      return 'reopened this';
    }
  }
}
