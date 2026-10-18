import type { AuthenticatedAppUser } from '@groam/app-actions/backend';
import { expect, test } from 'vite-plus/test';
import { buildResearchPlans, selectResearchTripIndexes } from './build-research-plans';
import {
  type SeedWorkspaceResearchActions,
  seedWorkspaceResearches
} from './seed-workspace-researches';

function user(n: number): AuthenticatedAppUser {
  return {
    cookie: `c${n}`,
    email: `u${n}@groam.example`,
    name: `User ${n}`,
    password: 'x',
    status: 'existing',
    userId: `user-${n}`
  };
}

test('selects every other open trip, capped', () => {
  const trips = Array.from({ length: 100 }, (_, index) => ({ archived: index === 2, known: true }));
  const indexes = selectResearchTripIndexes(trips);
  expect(indexes.slice(0, 3)).toEqual([0, 4, 6]);
  expect(indexes).toHaveLength(20);
});

test('plans two researches with several authors and a link', () => {
  const plans = buildResearchPlans('Lisbon');
  expect(plans).toHaveLength(2);
  for (const plan of plans) {
    expect(plan.messages.length).toBeGreaterThanOrEqual(3);
    expect(plan.messages.length).toBeLessThanOrEqual(6);
    expect(new Set(plan.messages.map(({ authorIndex }) => authorIndex)).size).toBeGreaterThan(2);
  }
  expect(
    plans.flatMap(({ messages }) => messages).some(({ text }) => text.includes('https://'))
  ).toBe(true);
});

test('creates, posts and links researches deterministically', async () => {
  const calls: string[] = [];
  const app: SeedWorkspaceResearchActions = {
    createIssue: async () => 'issue-1',
    createResearch: async (_user, input) => {
      calls.push(`create:${input.clientRequestId}`);
      return `d-${input.clientRequestId}`;
    },
    findTripResearchTargets: async () => ({
      destination: { id: 'dest-1', name: 'Lisbon, Portugal' },
      issues: []
    }),
    linkResearch: async (_user, input) => {
      calls.push(`link:${input.target.kind}`);
    },
    postResearchMessage: async (_user, input) => {
      calls.push(`post:${input.clientRequestId}`);
    }
  };
  const users = [user(0), user(1), user(2), user(3)];
  const run = () =>
    seedWorkspaceResearches(app, {
      concurrency: 1,
      owner: users[0]!,
      tripCount: 2,
      tripIds: ['t1', 't2'],
      users
    });
  const first = await run();
  const firstCalls = [...calls];
  calls.length = 0;
  await run();

  expect(first.researchCount).toBe(2);
  expect(calls).toEqual(firstCalls);
  expect(firstCalls.filter((call) => call === 'link:issue')).toHaveLength(2);
  expect(firstCalls.filter((call) => call === 'link:tripTarget')).toHaveLength(2);
});
