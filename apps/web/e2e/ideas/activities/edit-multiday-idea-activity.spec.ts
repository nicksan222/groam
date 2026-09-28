import {
  addIdea,
  addStop,
  continueActivityPlan,
  createTrip,
  ids,
  inlineActivityEditor,
  mockDestinationSearch,
  openActivityPlan,
  openItinerary,
  saveSevenDayRange,
  signIn,
  startActivityPlan,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@playwright/test';

test('editing from a continuation day shows the complete activity range', async ({ page }) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  await signIn(page);
  const suffix = uniqueSuffix();
  await createTrip(page, { name: `Multi-day plan ${suffix}` });
  await addIdea(page, { name: `Multi-day idea ${suffix}` });
  await saveSevenDayRange(page);
  await openItinerary(page);
  await addStop(page, { name: 'Porto', notes: 'River walk', startDay: '4', endDay: '6' });
  await startActivityPlan(page);
  await continueActivityPlan(page, 'Three-day festival', { startDay: 4, endDay: 6 });
  await expect(page.getByRole('region', { name: 'Day 6 schedule' })).toContainText(
    'Three-day festival'
  );
  await openActivityPlan(page, 'Three-day festival', 6);
  const editor = inlineActivityEditor(page);
  await expect(editor).toContainText('Days 4–6 · Porto, Portugal');
  await expect(editor.getByTestId(ids.activityTitle)).toHaveValue('Three-day festival');
  await expect(editor.getByTestId(ids.activitySubmit)).toBeEnabled();
});
