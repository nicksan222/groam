import type { Page } from '@playwright/test';
import { photonResult, photonUrlPattern } from '#src/testing/photon';

export async function mockDestinationSearch(page: Page): Promise<void> {
  await page.route(photonUrlPattern, (route) => {
    const query = new URL(route.request().url()).searchParams.get('q') ?? '';
    return route.fulfill({ json: photonResult(query) });
  });
}
