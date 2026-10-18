import type { Locator, Page } from '@playwright/test';

export type UiUser = {
  page: Page;
  click(target: Locator): Promise<void>;
  type(target: Locator, value: string): Promise<void>;
  press(target: Locator, key: string): Promise<void>;
  point(target: Locator): Promise<void>;
};

export type UiTarget = Page | UiUser;

export function ui(target: UiTarget): UiUser {
  if ('page' in target) return target;
  return {
    page: target,
    click: (locator) => locator.click(),
    async type(locator, value) {
      await locator.fill(value);
    },
    press: (locator, key) => locator.press(key),
    async point(locator) {
      await locator.scrollIntoViewIfNeeded();
    }
  };
}
