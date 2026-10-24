import { expect, test } from 'vite-plus/test';
import { assistantScreenLimits, validateAssistantScreen } from '#ai/runtime/screen';
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
  expect(prompt).toContain('request_changes');
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

test('review screen clamps long titles so validation passes', () => {
  const screen = reviewStandaloneScreen({
    changes: [],
    id: 'p1',
    sourceTripId: 's',
    title: 't'.repeat(200),
    workingTripId: 'w'
  });
  expect(screen.title.length).toBeLessThanOrEqual(assistantScreenLimits.title);
  expect(() => validateAssistantScreen(screen)).not.toThrow();
});
