import { expect } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import { by, dialogSubmit, issueRow, issueStatusOption } from './locators';
import { openTripSection } from './open-trips';
import { expectGone, expectPath, idFromPath, presentAttribute, tap, enter } from './queries';

export type IssueStatus = 'closed' | 'open';
export type IssueStatusFilter = 'all' | 'closed' | 'open';

/** Opens an issue page directly and returns the short id the app canonicalizes its URL to. */
export async function openIssue(issueId: string): Promise<string> {
  await openAppPath(`issues/${issueId}`);
  await presentAttribute(by(ids.issueHeading), 'data-issue-id');
  await expectPath(/\/issues\/[a-z]{6}(?:[/?#]|$)/u);
  return idFromPath('issues');
}

export async function openIssuesInbox(): Promise<void> {
  await tap(by(ids.navIssues));
  await expect.element(by(ids.issuesTitle)).toBeVisible();
}

export async function filterIssuesByStatus(status: IssueStatusFilter): Promise<void> {
  await tap(by(ids.issueStatusFilter));
  await tap(issueStatusOption(status));
}

export async function openIssueFromInbox(
  title: string,
  options: { status?: IssueStatusFilter } = {}
): Promise<void> {
  await openIssuesInbox();
  if (options.status) await filterIssuesByStatus(options.status);
  const row = issueRow(title);
  await expect.element(row).toBeVisible();
  await tap(row);
  await expect.element(by(ids.issueHeading)).toMatchTextContent(title);
}

export async function openIssueFromTrip(tripId: string, title: string): Promise<void> {
  await openAppPath(`trips/${tripId}/issues`);
  const row = issueRow(title);
  await expect.element(row).toBeVisible();
  await tap(row);
  await expect.element(by(ids.issueHeading)).toMatchTextContent(title);
}

export async function setIssueStatus(status: IssueStatus): Promise<void> {
  const current = by(ids.issueStatus);
  await expect.element(current).toBeInTheDocument();
  if (current.element().getAttribute('data-status') === status) return;
  await tap(by(ids.issueToggleStatus));
  await expect.element(current).toHaveAttribute('data-status', status);
}

/** Creates an issue from the trip's Issues tab and returns the id from the URL. */
export async function createIssue(input: { body: string; title: string }): Promise<string> {
  await openTripSection('issues');
  await tap(by(ids.newIssue));
  await expect.element(by(ids.createIssueDialog)).toBeVisible();
  await enter(by(ids.createIssueTitle), input.title);
  await enter(by(ids.createIssueBody), input.body);
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

export type IssueAssignee = { kind: 'agent' } | { kind: 'user'; name: string };

export async function assignIssue(assignee: IssueAssignee): Promise<void> {
  await tap(by(ids.issueEditAssignees));
  if (assignee.kind === 'agent') {
    await tap(by(ids.issueAssignGroam));
    await expect.element(page.getByText('Issue agent').first()).toBeVisible();
    return;
  }
  await tap(page.getByRole('button', { name: `Assign ${assignee.name}` }));
  await expect.element(page.getByText(assignee.name).first()).toBeVisible();
}

/** Starts an idea from the open issue and returns the idea's name. */
export async function startIdeaFromIssue(): Promise<string> {
  await tap(by(ids.issueEditIdea));
  await tap(by(ids.issueStartIdea));
  const workspace = by(ids.ideaWorkspace);
  return presentAttribute(workspace, 'data-idea-name');
}
