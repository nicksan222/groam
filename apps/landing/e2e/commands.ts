import { defineBrowserCommand } from 'vite-plus/test/browser-playwright';

// Errors the site raises inside the test page, its frames included; Playwright sees them
// before any script in the frame could attach a listener.
const errors = new WeakMap<object, string[]>();

export const siteCommands = {
  /** Emulates the visitor's motion and color preferences for the page and its frames. */
  emulateMedia: defineBrowserCommand<
    [{ reducedMotion?: 'reduce' | 'no-preference'; colorScheme?: 'light' | 'dark' }]
  >(async ({ page }, media) => {
    await page.emulateMedia(media);
  }),
  /** Starts recording uncaught errors and console errors from now on. */
  watchErrors: defineBrowserCommand(async ({ page }) => {
    if (errors.has(page)) {
      errors.set(page, []);
      return;
    }
    errors.set(page, []);
    page.on('pageerror', (error) => errors.get(page)?.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.get(page)?.push(message.text());
    });
  }),
  /** Returns the errors recorded since `watchErrors`. */
  takeErrors: defineBrowserCommand(async ({ page }): Promise<string[]> => [
    ...(errors.get(page) ?? [])
  ])
};

declare module 'vitest/internal/browser' {
  interface BrowserCommands {
    emulateMedia: (media: {
      reducedMotion?: 'reduce' | 'no-preference';
      colorScheme?: 'light' | 'dark';
    }) => Promise<void>;
    watchErrors: () => Promise<void>;
    takeErrors: () => Promise<string[]>;
  }
}
