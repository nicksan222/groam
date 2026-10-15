import { type Locator, locators, page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';

declare module 'vite-plus/test/browser' {
  interface LocatorSelectors {
    /** An element by raw CSS; Vitest has no built-in selector for attribute and structure queries. */
    getByCss(css: string): Locator;
  }
}

locators.extend({
  getByCss(css: string) {
    return `css=${css}`;
  }
});

/** Where to look: the page, or within another locator. */
export type LocatorScope = typeof page | Locator;

/** An element by raw CSS, within `scope` (the page by default). */
export function css(selector: string, scope: LocatorScope = page): Locator {
  return scope.getByCss(selector);
}

export function by(id: string, scope: LocatorScope = page): Locator {
  return scope.getByTestId(id);
}

export function dialogSubmit(dialogId: string): Locator {
  return page.getByTestId(`${dialogId}-submit`);
}

/** An element by test id whose `attribute` equals `value`, such as a card by its name. */
export function named(
  testId: string,
  attribute: string,
  value: string,
  scope: LocatorScope = page
) {
  return css(`[data-testid="${testId}"][${attribute}=${JSON.stringify(value)}]`, scope);
}

export const tripCard = (tripName: string) => named(ids.tripCard, 'data-trip-name', tripName);
export const destinationCard = (placeName: string) =>
  named(ids.destinationCard, 'data-place-name', placeName);
export const destinationResult = (placeName: string) =>
  named(ids.destinationSearchResult, 'data-place-name', placeName);
export const activityCard = (title: string) =>
  named(ids.activityCard, 'data-activity-title', title);
export const inlineActivityEditor = (scope: LocatorScope = page) =>
  by(ids.activityInlineEditor, scope);
export const stayCard = (title: string) => named(ids.stayCard, 'data-stay-name', title);
export const issueRow = (title: string) => named(ids.issueRow, 'data-issue-title', title);
export const ideaRow = (ideaTitle: string) =>
  page
    .getByTestId(ids.ideaRow)
    .filter({ has: page.getByRole('heading', { name: ideaTitle }) })
    .or(named(ids.ideaRow, 'data-idea-name', ideaTitle));
export const chatRow = (title: string) => named(ids.chatRow, 'data-chat-title', title);
export const chatMember = (name: string) => named(ids.chatMember, 'data-member-name', name);
export const chatMessage = (content: string) => named(ids.chatMessage, 'data-content', content);
export const groupSwitcherItem = (groupName: string) =>
  named(ids.groupSwitcherItem, 'data-group-name', groupName);
export const issueStatusOption = (status: 'all' | 'closed' | 'open') =>
  named(ids.issueStatusOption, 'data-status', status);

export function planTravel(from: string, to: string): Locator {
  return css(
    `[data-testid="${ids.planTravel}"][data-from=${JSON.stringify(from)}][data-to=${JSON.stringify(to)}]`
  );
}

export function calendarDay(dayValue?: string): Locator {
  return css(
    dayValue
      ? `[data-slot="calendar"] button[data-day=${JSON.stringify(dayValue)}]:not([disabled])`
      : '[data-slot="calendar"] button[data-day]:not([disabled])'
  );
}

/**
 * The Groam AI panel (docked or sheet). Its accessible name follows the active chat title,
 * so locate it by its stable id instead.
 */
export const assistantPanel = () => css('#ai-assistant-widget');
