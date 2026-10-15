import { expect } from 'vite-plus/test';
import { type Locator } from 'vite-plus/test/browser';

/**
 * Runs `step` for each item, one after another. Steps either read what the previous one changed
 * or assert (`expect.element` must be awaited, and the repo's lint rule rejects `Promise.all`
 * around it), so they cannot run together.
 */
export async function inOrder<Item>(
  items: readonly Item[],
  step: (item: Item) => Promise<void>
): Promise<void> {
  for (const item of items) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Sequential by design, see above.
    await step(item);
  }
}

/** Waits until nothing matches the locator. */
export async function expectGone(locator: Locator): Promise<void> {
  await expect.poll(() => locator.elements().length).toBe(0);
}

/** Waits until the element has some non-empty value for an attribute and returns it. */
export async function presentAttribute(locator: Locator, name: string): Promise<string> {
  await expect.poll(() => locator.query()?.getAttribute(name) ?? '').toMatch(/.+/u);
  return locator.element().getAttribute(name) ?? '';
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
