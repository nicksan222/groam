import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { formatIdeaDisplayName } from '@/features/trips/trip-ideas/format-idea-display-name';
import { TripIdeaBadge } from '@/features/trips/trip-ideas/trip-idea-name';

test('formatIdeaDisplayName turns slugs into travel nicknames', async () => {
  expect(formatIdeaDisplayName('coast-day')).toBe('Coast day');
  expect(formatIdeaDisplayName('brave-otter')).toBe('Brave otter');
  expect(formatIdeaDisplayName('dates/seven-day-plan-e2e-13j2z')).toBe(
    'Dates · seven day plan e2e 13j2z'
  );
  expect(formatIdeaDisplayName('Coastal-route')).toBe('Coastal route');
});

test('TripIdeaBadge hides the internal identifier behind a clear draft label', async () => {
  await render(<TripIdeaBadge name="dates/coast-day" />);

  await expect.element(page.getByText('Draft')).toBeInTheDocument();
  await expect
    .element(page.getByText('Draft'))
    .toHaveAttribute('data-idea-name', 'dates/coast-day');
});
