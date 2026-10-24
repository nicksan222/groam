import { expect, test } from 'vite-plus/test';
import { assistantScreenLimits, validateAssistantScreen } from '#ai/runtime/screen';
import { issueStandalonePrompt, issueStandaloneScreen } from './issue';

const issue = {
  body: 'Add a rainy-day route option before implementation.',
  id: 'issue-1',
  title: 'Rainy-day option',
  tripId: 'trip-1',
  tripName: 'Lisbon'
};

test('builds the standalone issue worker prompt', () => {
  expect(issueStandalonePrompt(issue)).toContain('Rainy-day option');
  expect(issueStandalonePrompt(issue)).toContain('implement the issue');
  expect(issueStandalonePrompt(issue)).toContain('Confirm what changed');
});

test('builds a trip issue screen snapshot for tools', () => {
  expect(issueStandaloneScreen(issue)).toMatchObject({
    key: 'issue:issue-1:run',
    target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
    title: 'Lisbon · Rainy-day option'
  });
});

test('issue screen clamps long titles so validation passes', () => {
  const screen = issueStandaloneScreen({
    body: 'x'.repeat(100_000),
    id: 'i1',
    title: 't'.repeat(160),
    tripId: 'trip1',
    tripName: 'n'.repeat(80)
  });
  expect(screen.title.length).toBeLessThanOrEqual(assistantScreenLimits.title);
  expect(screen.title.endsWith('…')).toBe(true);
  expect(() => validateAssistantScreen(screen)).not.toThrow();
});
