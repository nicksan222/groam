import { expect, test } from 'vitest';
import { reviewStandalonePrompt, reviewStandaloneScreen } from './review';

const review = {
  changes: [{ change: 'modified', label: 'Trip dates' }],
  id: 'proposal-1',
  sourceTripId: 'trip-shared',
  title: 'Kyoto food crawl',
  workingTripId: 'trip-working'
};

test('builds the standalone reviewer prompt', () => {
  const prompt = reviewStandalonePrompt(review);
  expect(prompt).toContain('Kyoto food crawl');
  expect(prompt).toContain('getItinerary');
  expect(prompt).toContain('trip-working');
  expect(prompt).toContain('trip-shared');
  expect(prompt).toContain('Trip dates');
});

test('builds a versions screen snapshot for tools', () => {
  expect(reviewStandaloneScreen(review)).toMatchObject({
    key: 'idea:proposal-1:review',
    target: { kind: 'trip', section: 'ideas', tripId: 'trip-working' },
    title: 'Kyoto food crawl · review'
  });
});
