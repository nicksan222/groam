import { type Locator, locators, page } from 'vite-plus/test/browser';
import type { IssueStatus } from '#src/actions/set-issue-status';
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
/** A row of a trip's Ideas, Issues, or Polls queue, by its title. */
export const queueRow = (title: string, scope?: LocatorScope) =>
  named(ids.queueRow, 'data-title', title, scope);
/** A row of Home's "Your turn" list, by its title. */
export const homeTurnRow = (title: string) => named(ids.homeTurnRow, 'data-title', title);
export const chatRow = (title: string) => named(ids.chatRow, 'data-chat-title', title);
export const chatMember = (name: string) => named(ids.chatMember, 'data-member-name', name);
export const chatMessage = (content: string) => named(ids.chatMessage, 'data-content', content);
export const groupSwitcherItem = (groupName: string) =>
  named(ids.groupSwitcherItem, 'data-group-name', groupName);
export const issueStatusSelectOption = (status: IssueStatus) =>
  named(ids.issueStatusSelectOption, 'data-status', status);

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
