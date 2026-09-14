import {
  addIdea,
  by,
  createTrip,
  ids,
  openIdeaComparison,
  openIdeaFromList,
  openTripSection,
  openWorkspaceIdeas,
  pageCanvas,
  resolvedBackground,
  signIn,
  twoColumnPageLayout,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('idea tabs share the page canvas while itinerary uses its full width', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await createTrip(page, { name: `Layout defaults ${uniqueSuffix()}` });
  const ideaName = `Consistent tabs ${uniqueSuffix()}`;
  await addIdea(page, { name: ideaName });
  await openWorkspaceIdeas(page);
  const sidebarLink = await by(page, ids.navTrips).elementHandle();
  if (!sidebarLink) throw new Error('Expected workspace navigation');
  await openIdeaFromList(page, ideaName);
  await expect(by(page, ids.tripHeading)).toContainText(ideaName);
  expect(await sidebarLink.evaluate((element) => element.isConnected)).toBe(true);

  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await openTripSection(page, 'overview');
    const overview = await twoColumnPageLayout(page);
    const canvas = await pageCanvas(page);
    expect(overview.overflow).toBe(false);
    expect(overview.stacked).toBe(width < 1280);
    if (width >= 1280) expect(overview.rightWidth).toBe(320);
    await openTripSection(page, 'itinerary');
    const itinerary = await twoColumnPageLayout(page);
    expect(itinerary.overflow).toBe(false);
    expect(itinerary.stacked).toBe(width < 1280);
    if (width >= 1280) expect(itinerary.rightWidth).toBe(320);
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

test('all shared trip tabs retain the Overview canvas', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await createTrip(page, { name: `Trip canvas ${uniqueSuffix()}` });
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
