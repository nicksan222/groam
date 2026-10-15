import {
  addStop,
  continueActivityPlan,
  ids,
  inlineActivityEditor,
  mockDestinationSearch,
  openActivityPlan,
  openIdea,
  openItinerary,
  saveSevenDayRange,
  startActivityPlan,
  uniqueSuffix
} from '@groam/app-actions/playwright';
import { expect, test } from '@groam/app-actions/playwright/test';

test('editing from a continuation day shows the complete activity range', async ({
  arrange,
  page
}) => {
  test.setTimeout(120_000);
  await mockDestinationSearch(page);
  const suffix = uniqueSuffix();
  const tripId = await arrange.createTrip({ name: `Multi-day plan ${suffix}` });
  const { proposalId } = await arrange.startIdea({ name: `Multi-day idea ${suffix}`, tripId });
  await openIdea(page, { proposalId, tripId });
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
