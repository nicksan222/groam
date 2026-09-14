import { expect, test } from 'vitest';
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
  expect(issueStandalonePrompt(issue)).toContain('write tools');
  expect(issueStandalonePrompt(issue)).toContain('implement the issue');
});

test('builds a trip issue screen snapshot for tools', () => {
  expect(issueStandaloneScreen(issue)).toMatchObject({
    key: 'issue:issue-1:run',
    target: { kind: 'trip', section: 'issues', tripId: 'trip-1' },
    title: 'Lisbon · Rainy-day option'
  });
});
