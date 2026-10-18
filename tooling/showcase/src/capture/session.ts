import { chromium, type Page } from '@playwright/test';
import type { ActorDefinition } from '#src/capture/scenario';
import type { CaptureProfile } from '#src/model';

export function assertLocalUrl(value: string) {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error('Showcase capture requires a local demo app (localhost, 127.0.0.1, or ::1).');
  }
}

export async function openSession(
  actors: readonly ActorDefinition[],
  profile: CaptureProfile,
  options: { baseUrl: string; headed: boolean }
) {
  assertLocalUrl(options.baseUrl);
  const browser = await chromium.launch({
    headless: !options.headed,
    args: [
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows'
    ]
  });
  const pages: Record<string, Page> = {};
  const close = async () => {
    await Promise.allSettled(browser.contexts().map((context) => context.close()));
    await browser.close();
  };
  try {
    for (const actor of actors) {
      const context = await browser.newContext({
        baseURL: options.baseUrl,
        viewport: profile.viewport,
        deviceScaleFactor: profile.deviceScaleFactor,
        colorScheme: profile.colorScheme,
        locale: 'en-GB',
        timezoneId: 'Europe/Rome'
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20_000);
      page.setDefaultNavigationTimeout(30_000);
      pages[actor.id] = page;
    }
    return { pages, close };
  } catch (error) {
    await close();
    throw error;
  }
}
