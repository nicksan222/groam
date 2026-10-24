import { expect, test } from 'vite-plus/test';
import { agentRunBack } from './agent-run-href';

const none = { discussionId: null, issueId: null, proposalId: null, tripId: null };

test.each([
  [{ ...none, tripId: 't1', issueId: 'i1' }, 'Issues', 'issues'],
  [{ ...none, tripId: 't1', proposalId: 'p1' }, 'Ideas', 'ideas'],
  [{ ...none, tripId: 't1' }, 'Activity', 'activity']
] as const)('a run in a trip goes back to its %s section', (run, label, section) => {
  expect(agentRunBack(run)).toEqual({
    label,
    target: { params: { section, tripId: 't1' }, to: '/trips/$tripId/$section' }
  });
});

test('a chat run goes back to its chat', () => {
  expect(agentRunBack({ ...none, tripId: 't1', discussionId: 'd1' })).toEqual({
    label: 'Chat',
    target: { params: { discussionId: 'd1' }, to: '/chat/$discussionId' }
  });
});

test('a run with no trip goes back Home', () => {
  expect(agentRunBack(none)).toEqual({ label: 'Home', target: { to: '/' } });
});
