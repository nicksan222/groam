import type { Locator, Page } from '@playwright/test';
import type { IssueStatus, IssueStatusFilter } from '#src/actions/set-issue-status';
import { ids } from '#src/testing/ids';

const idPathPatterns = {
  ideas: /\/ideas\/([^/]+)/u,
  issues: /\/issues\/([^/]+)/u,
  trips: /\/trips\/([^/]+)/u
} as const;

export function by(page: Page, id: (typeof ids)[keyof typeof ids]): Locator {
  return page.getByTestId(id);
}

export function dialogSubmit(page: Page, dialogId: string): Locator {
  return page.getByTestId(`${dialogId}-submit`);
}

function named(page: Page, testId: string, attribute: string, value: string): Locator {
  return page.locator(`[data-testid="${testId}"][${attribute}=${JSON.stringify(value)}]`);
}

export function tripCard(page: Page, tripName: string): Locator {
  return named(page, ids.tripCard, 'data-trip-name', tripName);
}

export function inlineActivityEditor(page: Page): Locator {
  return by(page, ids.activityInlineEditor);
}

export function issueRow(page: Page, title: string): Locator {
  return named(page, ids.issueRow, 'data-issue-title', title);
}

export function ideaRow(page: Page, ideaTitle: string): Locator {
  return page
    .getByTestId(ids.ideaRow)
    .filter({ has: page.getByRole('heading', { exact: true, name: ideaTitle }) })
    .or(named(page, ids.ideaRow, 'data-idea-name', ideaTitle));
}

export function chatMember(page: Page, name: string): Locator {
  return named(page, ids.chatMember, 'data-member-name', name);
}

export function chatMessage(page: Page, content: string): Locator {
  return named(page, ids.chatMessage, 'data-content', content);
}

export function issueStatusOption(page: Page, status: IssueStatusFilter): Locator {
  return named(page, ids.issueStatusOption, 'data-status', status);
}

export function issueStatusSelectOption(page: Page, status: IssueStatus): Locator {
  return named(page, ids.issueStatusSelectOption, 'data-status', status);
}

export function idFromPath(page: Page, kind: 'ideas' | 'issues' | 'trips'): string {
  const match = new URL(page.url()).pathname.match(idPathPatterns[kind]);
  if (!match?.[1]) throw new Error(`Expected a /${kind}/:id URL, got ${page.url()}`);
  return match[1];
}

/**
 * The Groam AI panel (docked or sheet). Its accessible name follows the active chat title,
 * so locate it by its stable id instead.
 */
export function assistantPanel(page: Page): Locator {
  return page.locator('#ai-assistant-widget');
}
