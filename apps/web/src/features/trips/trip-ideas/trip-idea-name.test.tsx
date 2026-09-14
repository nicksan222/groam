import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { formatIdeaDisplayName } from '@/features/trips/trip-ideas/format-idea-display-name';
import { TripIdeaBadge } from '@/features/trips/trip-ideas/trip-idea-name';

test('formatIdeaDisplayName turns slugs into travel nicknames', () => {
  expect(formatIdeaDisplayName('coast-day')).toBe('Coast day');
  expect(formatIdeaDisplayName('brave-otter')).toBe('Brave otter');
  expect(formatIdeaDisplayName('dates/seven-day-plan-e2e-13j2z')).toBe(
    'Dates · seven day plan e2e 13j2z'
  );
  expect(formatIdeaDisplayName('Coastal-route')).toBe('Coastal route');
});

test('TripIdeaBadge hides the internal identifier behind a clear draft label', () => {
  render(<TripIdeaBadge name="dates/coast-day" />);

  expect(screen.getByText('Draft')).toBeTruthy();
  expect(screen.getByText('Draft').getAttribute('data-idea-name')).toBe('dates/coast-day');
});
