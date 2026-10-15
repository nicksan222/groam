import {
  by,
  ids,
  openApp,
  openIdeaComparison,
  openIdeaFromList,
  openTrip,
  openTripSection,
  openWorkspaceIdeas,
  pageCanvas,
  resolvedBackground,
  twoColumnPageLayout,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('idea tabs share the page canvas while itinerary uses its full width', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  const tripId = await arrange.createTrip({ name: `Layout defaults ${uniqueSuffix()}` });
  const ideaName = `Consistent tabs ${uniqueSuffix()}`;
  await arrange.startIdea({ name: ideaName, tripId });
  await openApp(page);
  await openWorkspaceIdeas(page);
  const sidebarLink = await by(page, ids.navTrips).elementHandle();
  if (!sidebarLink) throw new Error('Expected workspace navigation');
  await openIdeaFromList(page, ideaName);
  await expect(by(page, ids.tripHeading)).toContainText(ideaName);
  expect(await sidebarLink.evaluate((element) => element.isConnected)).toBe(true);

  // Trip pages size their supporting column from the trip workspace container (18rem).
  const tripRightColumn = 288;
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await openTripSection(page, 'overview');
    const overview = await twoColumnPageLayout(page);
    const canvas = await pageCanvas(page);
    expect(overview.overflow).toBe(false);
    expect(overview.stacked).toBe(width < 1280);
    if (width >= 1280) expect(overview.rightWidth).toBe(tripRightColumn);
    await openTripSection(page, 'itinerary');
    // The itinerary editor is a single full-width section without a supporting column.
    await expect(page.getByRole('region', { name: 'Itinerary editor' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width
    );
    const itineraryWidth = await page.locator('[data-slot="shell-page-body"]').evaluate((body) => {
      const section = body.querySelector<HTMLElement>('section[aria-label="Itinerary editor"]');
      if (!section) throw new Error('Expected the itinerary content section');
      const style = getComputedStyle(body);
      return {
        available: Math.round(
          body.clientWidth -
            Number.parseFloat(style.paddingLeft) -
            Number.parseFloat(style.paddingRight)
        ),
        content: Math.round(section.getBoundingClientRect().width)
      };
    });
    expect(itineraryWidth.content).toBe(itineraryWidth.available);
    await expect.poll(() => pageCanvas(page)).toEqual(canvas);

    await openIdeaComparison(page);
    await expect.poll(() => twoColumnPageLayout(page)).toEqual(overview);
    await expect.poll(() => pageCanvas(page)).toEqual(canvas);
  }
});

test('all shared trip tabs retain the Overview canvas', async ({ arrange, page }) => {
  test.setTimeout(120_000);
  await openTrip(page, await arrange.createTrip({ name: `Trip canvas ${uniqueSuffix()}` }));
  for (const dark of [false, true]) {
    await page.evaluate(
      (enabled) => document.documentElement.classList.toggle('dark', enabled),
      dark
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await openTripSection(page, 'overview');
      const overview = await pageCanvas(page);
      expect(overview.overflow).toBe(false);
      expect(overview.background).toBe(await resolvedBackground(page, 'var(--canvas)'));
      await expect(page.locator('[data-slot=sidebar-wrapper]')).toHaveCSS(
        'background-color',
        await resolvedBackground(page, 'transparent')
      );
      for (const tab of ['issues', 'ideas', 'activity'] as const) {
        await openTripSection(page, tab);
        await expect.poll(() => pageCanvas(page)).toEqual(overview);
      }
    }
  }
});
