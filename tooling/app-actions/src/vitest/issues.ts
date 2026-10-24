import { expect } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { IssueStatus } from '#src/actions/set-issue-status';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { buildIssueRule, type RuleSpec } from './issue-rules';
import { by, queueRow, dialogSubmit, issueStatusSelectOption } from './locators';
import { openTripSection } from './open-trips';
import { expectGone, expectPath, idFromPath, presentAttribute, tap, enter } from './queries';
import { openTripQueue, showQueue } from './queue';

export type { IssueStatus };

/** Opens an issue page directly and returns the short id the app canonicalizes its URL to. */
export async function openIssue(issueId: string): Promise<string> {
  await openAppPath(`issues/${issueId}`);
  await presentAttribute(by(ids.issueHeading), 'data-issue-id');
  await expectPath(/\/issues\/[a-z]{6}(?:[/?#]|$)/u);
  return idFromPath('issues');
}

/** Opens an issue from its trip's Issues queue, from the open groups, or from Settled with `fromSettled: true`. */
export async function openIssueFromTrip(
  tripId: string,
  title: string,
  options: { fromSettled?: boolean } = {}
): Promise<void> {
  await openTripQueue(tripId, 'issues');
  if (options.fromSettled) await showQueue();
  const row = queueRow(title);
  await expect.element(row).toBeVisible();
  await tap(row.getByRole('link', { name: title, exact: true }));
  await expect.element(by(ids.issueHeading)).toMatchTextContent(title);
}

/** Opens an issue from the open trip's Issues queue. */
export async function openIssueFromQueue(title: string): Promise<void> {
  await openTripSection('issues');
  const row = queueRow(title);
  await expect.element(row).toBeVisible();
  await tap(row.getByRole('link', { name: title, exact: true }));
  await expect.element(by(ids.issueHeading)).toMatchTextContent(title);
}

export async function setIssueStatus(status: IssueStatus): Promise<void> {
  const current = by(ids.issueStatus);
  await expect.element(current).toBeInTheDocument();
  if (current.element().getAttribute('data-status') === status) return;
  await tap(current);
  await tap(issueStatusSelectOption(status));
  await expect.element(current).toHaveAttribute('data-status', status);
}

/**
 * Creates an issue from the open trip's Issues section (`newIssue` button), optionally with a
 * "Done when" rule built in the dialog, and returns the id from the URL.
 */
export async function createIssue(input: {
  body: string;
  rule?: RuleSpec;
  title: string;
}): Promise<string> {
  await openTripSection('issues');
  await tap(by(ids.newIssue));
  await expect.element(by(ids.createIssueDialog)).toBeVisible();
  await enter(by(ids.createIssueTitle), input.title);
  await enter(by(ids.createIssueBody), input.body);
  if (input.rule) await buildIssueRule(input.rule);
  await tap(dialogSubmit(ids.createIssueDialog));
  await expectGone(by(ids.createIssueDialog));
  await presentAttribute(by(ids.issueHeading), 'data-issue-id');
  return idFromPath('issues');
}

export async function addIssueComment(content: string): Promise<void> {
  await enter(by(ids.issueComment), content);
  await tap(by(ids.issueCommentSubmit));
  await expect.element(page.getByText(content)).toBeVisible();
}

export type IssueAssignee = { kind: 'agent' } | { kind: 'me' } | { kind: 'user'; name: string };

export async function assignIssue(assignee: IssueAssignee): Promise<void> {
  await tap(by(ids.issueEditAssignees));
  await expect.element(by(ids.issueAssigneePicker)).toBeVisible();
  if (assignee.kind === 'agent') {
    await tap(by(ids.issueAssignGroam));
    await expect.element(page.getByText('Issue agent').first()).toBeVisible();
    return;
  }
  if (assignee.kind === 'me') {
    await tap(by(ids.issueAssignMe));
    return;
  }
  await tap(page.getByRole('button', { name: `Assign ${assignee.name}` }));
  await expect.element(page.getByText(assignee.name).first()).toBeVisible();
}

/** Starts an idea from the open issue and returns the idea's name. */
export async function startIdeaFromIssue(): Promise<string> {
  await tap(by(ids.issueStartIdea));
  const workspace = by(ids.ideaWorkspace);
  return presentAttribute(workspace, 'data-idea-name');
}

/** Opens the assignees control on the open issue, checks "Assign me" is on, and closes it again. */
export async function expectIssueAssignedToMe(): Promise<void> {
  await tap(by(ids.issueEditAssignees));
  await expect.element(by(ids.issueAssignMe)).toHaveAttribute('aria-pressed', 'true');
  await userEvent.keyboard('{Escape}');
  await expectGone(by(ids.issueAssigneePicker));
}
