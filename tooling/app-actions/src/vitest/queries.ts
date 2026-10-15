import { expect } from 'vite-plus/test';
import { type Locator } from 'vite-plus/test/browser';

/** Whether any element matching the locator is currently rendered and visible. */
export function isVisible(locator: Locator): boolean {
  return locator
    .elements()
    .some((element) => element.checkVisibility({ visibilityProperty: true }));
}

/** Waits until exactly `count` elements match the locator. */
export async function expectCount(locator: Locator, count: number): Promise<void> {
  await expect.poll(() => locator.elements().length).toBe(count);
}

/** Waits until nothing matches the locator. */
export function expectGone(locator: Locator): Promise<void> {
  return expectCount(locator, 0);
}

/** Waits until the locator is absent or hidden. */
export async function expectHidden(locator: Locator): Promise<void> {
  await expect.poll(() => isVisible(locator)).toBe(false);
}

/** Waits until any element matches, then returns the attribute of the first. */
export async function attribute(locator: Locator, name: string): Promise<string | null> {
  await expect.element(locator).toBeInTheDocument();
  return locator.element().getAttribute(name);
}

/** Waits until the element has some non-empty value for an attribute and returns it. */
export async function presentAttribute(locator: Locator, name: string): Promise<string> {
  await expect.poll(() => locator.query()?.getAttribute(name) ?? '').toMatch(/.+/u);
  return locator.element().getAttribute(name) ?? '';
}

/** Waits until the element's text matches. */
export async function expectText(locator: Locator, pattern: RegExp | string): Promise<void> {
  await expect
    .poll(() => locator.query()?.textContent?.replaceAll(/\s+/gu, ' ').trim() ?? '')
    [typeof pattern === 'string' ? 'toBe' : 'toMatch'](pattern as never);
}

/** The current location as the app sees it. */
export function currentPath(): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

/** Waits until the URL path (and query) matches. */
export async function expectPath(pattern: RegExp): Promise<void> {
  await expect.poll(() => currentPath()).toMatch(pattern);
}

/** The id that follows `/ideas/`, `/issues/` or `/trips/` in the current URL. */
export function idFromPath(kind: 'ideas' | 'issues' | 'trips'): string {
  const match = new RegExp(`/${kind}/([^/?#]+)`, 'u').exec(location.pathname);
  if (!match?.[1]) throw new Error(`Expected a /${kind}/:id URL, got ${currentPath()}`);
  return match[1];
}

/** Clicks once the target is shown and enabled; a busy machine can take a while to get there. */
export async function tap(locator: Locator): Promise<void> {
  await expect.element(locator).toBeVisible();
  await expect.element(locator).toBeEnabled();
  await locator.click();
}

/** Types into a field once it is shown and enabled. */
export async function enter(locator: Locator, text: string): Promise<void> {
  await expect.element(locator).toBeVisible();
  await expect.element(locator).toBeEnabled();
  await locator.fill(text);
}
