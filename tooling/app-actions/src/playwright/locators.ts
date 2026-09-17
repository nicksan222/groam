import type { Locator, Page } from '@playwright/test';
import { ids } from './ids';

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

export function named(page: Page, testId: string, attribute: string, value: string): Locator {
  return page.locator(`[data-testid="${testId}"][${attribute}=${JSON.stringify(value)}]`);
}

export function tripCard(page: Page, tripName: string): Locator {
  return named(page, ids.tripCard, 'data-trip-name', tripName);
}

export function destinationCard(page: Page, placeName: string): Locator {
  return named(page, ids.destinationCard, 'data-place-name', placeName);
}

export function destinationResult(page: Page, placeName: string): Locator {
  return named(page, ids.destinationSearchResult, 'data-place-name', placeName);
}

export function activityCard(page: Page, title: string): Locator {
  return named(page, ids.activityCard, 'data-activity-title', title);
}

export function stayCard(page: Page, title: string): Locator {
  return named(page, ids.stayCard, 'data-stay-name', title);
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

export function chatRow(page: Page, title: string): Locator {
  return named(page, ids.chatRow, 'data-chat-title', title);
}

export function chatMember(page: Page, name: string): Locator {
  return named(page, ids.chatMember, 'data-member-name', name);
}

export function chatMessage(page: Page, content: string): Locator {
  return named(page, ids.chatMessage, 'data-content', content);
}

export function groupSwitcherItem(page: Page, groupName: string): Locator {
  return named(page, ids.groupSwitcherItem, 'data-group-name', groupName);
}

export function issueStatusOption(page: Page, status: 'all' | 'closed' | 'open'): Locator {
  return named(page, ids.issueStatusOption, 'data-status', status);
}

export function planTravel(page: Page, from: string, to: string): Locator {
  return page.locator(
    `[data-testid="${ids.planTravel}"][data-from=${JSON.stringify(from)}][data-to=${JSON.stringify(to)}]`
  );
}

export function calendarDay(page: Page, dayValue?: string): Locator {
  if (dayValue) {
    return page.locator(
      `[data-slot="calendar"] button[data-day=${JSON.stringify(dayValue)}]:not([disabled])`
    );
  }
  return page.locator('[data-slot="calendar"] button[data-day]:not([disabled])');
}

export function idFromPath(page: Page, kind: 'ideas' | 'issues' | 'trips'): string {
  const match = new URL(page.url()).pathname.match(idPathPatterns[kind]);
  if (!match?.[1]) throw new Error(`Expected a /${kind}/:id URL, got ${page.url()}`);
  return match[1];
}
