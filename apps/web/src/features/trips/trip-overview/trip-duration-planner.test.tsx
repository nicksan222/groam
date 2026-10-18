import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripDurationPlanner } from '@/features/trips/trip-overview/trip-duration-planner';

test('renders full-width start and end date fields', async () => {
  await render(
    <TripDurationPlanner
      canEdit
      minimumDays={1}
      onSave={vi.fn()}
      startDate={null}
      totalDays={null}
    />
  );

  const start = page.getByRole('button', { name: 'Choose start date' }).element();
  const end = page.getByRole('button', { name: 'Choose end date' }).element();
  expect(start.className).toContain('w-full');
  expect(end.className).toContain('w-full');
  expect(start.className).not.toContain('max-w-md');
  await expect.element(page.getByText('Start')).toBeInTheDocument();
  await expect.element(page.getByText('End')).toBeInTheDocument();
  await expect
    .element(page.getByText('Select both dates to set the trip length.'))
    .toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
});

test('shows a static locked range and start-idea path for proposers', async () => {
  const onStartVersion = vi.fn();
  await render(
    <TripDurationPlanner
      canEdit={false}
      canPropose
      minimumDays={1}
      onSave={vi.fn()}
      onStartVersion={onStartVersion}
      startDate="2026-08-01"
      totalDays={7}
    />
  );

  await expect.element(page.getByText('Shared')).toBeInTheDocument();
  await expect.element(page.getByText('Read-only')).not.toBeInTheDocument();
  await expect
    .element(
      page.getByText(
        'Everyone sees these dates. Start an idea to try others — the shared trip stays put.'
      )
    )
    .toBeInTheDocument();
  await expect
    .element(
      page.getByText('7 days. Start an idea to try other dates without changing the shared trip.')
    )
    .toBeInTheDocument();
  const shownDate = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  await expect.element(page.getByText(shownDate.format(new Date(2026, 7, 1)))).toBeInTheDocument();
  await expect.element(page.getByText(shownDate.format(new Date(2026, 7, 7)))).toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Choose start date' }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Choose end date' }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Saved' })).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Save dates' })).not.toBeInTheDocument();

  await page.getByRole('button', { name: 'New idea' }).click();
  expect(onStartVersion).toHaveBeenCalledOnce();
});

test('omits the start-idea control when the viewer cannot propose', async () => {
  await render(
    <TripDurationPlanner
      canEdit={false}
      canPropose={false}
      minimumDays={1}
      onSave={vi.fn()}
      startDate={null}
      totalDays={null}
    />
  );

  await expect
    .element(page.getByText('These dates cannot be edited on the shared trip.'))
    .toBeInTheDocument();
  await expect.element(page.getByText('Dates are not set.')).toBeInTheDocument();
  expect(page.getByText('Not set').elements()).toHaveLength(2);
  await expect.element(page.getByRole('button', { name: 'New idea' })).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Choose start date' }))
    .not.toBeInTheDocument();
});
