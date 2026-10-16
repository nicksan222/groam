import { expect } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { IssueStatus, IssueStatusFilter } from '#src/actions/set-issue-status';
import { ids } from '#src/testing/ids';
import { openAppPath } from './app-host';
import {
  by,
  dialogSubmit,
  issueCard,
  issueRow,
  issueStatusOption,
  issueStatusSelectOption
} from './locators';
import { expectGone, expectPath, idFromPath, presentAttribute, tap, enter } from './queries';

export type { IssueStatus, IssueStatusFilter };

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
  await openAppPath(`trips/${tripId}/board`);
  const card = issueCard(title);
  await expect.element(card).toBeVisible();
  await tap(card.getByRole('link', { name: title, exact: true }));
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

/** Creates an issue from the trip board's "To decide" lane (`newIssue` button) and returns the id from the URL. */
export async function createIssue(input: { body: string; title: string }): Promise<string> {
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
  await tap(by(ids.issueEditIdea));
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
