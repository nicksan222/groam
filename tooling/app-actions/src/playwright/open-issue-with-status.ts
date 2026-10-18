import type { IssueStatus } from '#src/actions/set-issue-status';
import { expectIssueStatus } from './expect-issue-status';
import type { UiTarget } from './interaction';
import { openIssueFromInbox } from './open-issue-from-inbox';

export type OpenIssueWithStatusInput = {
  status: IssueStatus;
  title: string;
};

export async function openIssueWithStatus(
  target: UiTarget,
  input: OpenIssueWithStatusInput
): Promise<void> {
  await openIssueFromInbox(target, input.title, { status: input.status });
  await expectIssueStatus(target, input.status);
}
