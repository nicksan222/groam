import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';

const timeout = 30_000;

async function setup() {
  const trip = await setupTrip(2);
  const [author, other] = trip.users;
  if (!(author && other)) throw new Error('Expected members');
  const issueId = await author.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Find a dinner spot for the first night.',
    title: 'First dinner',
    tripId: trip.tripId
  });
  const detail = async () => {
    const issue = await trip.owner.client.query(api.routes.trips.issues.get.run, { issueId });
    if (!issue) throw new Error('Expected the issue');
    return issue;
  };
  return { ...trip, author, detail, issueId, other };
}

test('stores a person assignee under the name the group roster uses', { timeout }, async () => {
  const { author, detail, issueId, owner } = await setup();
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { kind: 'user', name: 'Somebody Else Entirely', userId: author.userId },
    issueId
  });
  const issue = await detail();
  expect(issue.assignee).toEqual({ kind: 'user', name: 'Group member 1', userId: author.userId });
  expect(issue.comments.at(-1)?.content).toBe('Test Person assigned this to Group member 1');
});

test('names an agent assignee from the agent catalog', { timeout }, async () => {
  const { detail, issueId, owner } = await setup();
  await owner.client.mutation(api.routes.trips.issues.assign.run, {
    assignee: { agentId: 'issue', kind: 'agent', name: 'Totally Not An Agent' },
    issueId
  });
  const issue = await detail();
  expect(issue.assignee).toMatchObject({ agentId: 'issue', kind: 'agent' });
  expect(issue.assignee?.name).not.toBe('Totally Not An Agent');
  expect(issue.comments.at(-1)?.content).toBe(
    `Test Person assigned this to ${issue.assignee?.name}`
  );
});

test(
  'refuses an assignee from outside the group and leaves the issue alone',
  { timeout },
  async () => {
    const { detail, issueId, owner } = await setup();
    const outsider = await createOutsiderClient(owner.test);
    await expect(
      owner.client.mutation(api.routes.trips.issues.assign.run, {
        assignee: { kind: 'user', name: 'Outsider', userId: outsider.userId },
        issueId
      })
    ).rejects.toThrow('Assignees must be members of this group');
    await expect(
      owner.client.mutation(api.routes.trips.issues.assign.run, {
        assignee: { kind: 'user', name: 'Ghost', userId: 'no-such-user' },
        issueId
      })
    ).rejects.toThrow('Assignees must be members of this group');
    const issue = await detail();
    expect(issue.assignee).toBeNull();
    expect(issue.comments).toEqual([]);
  }
);

test('only organizers assign, even the issue author', { timeout }, async () => {
  const { author, issueId } = await setup();
  await expect(
    author.client.mutation(api.routes.trips.issues.assign.run, {
      assignee: { kind: 'user', name: 'Group member 1', userId: author.userId },
      issueId
    })
  ).rejects.toThrow('Only the trip creator or a group admin can assign trip issues');
});

test('the author sets, replaces, and clears a decide-by date', { timeout }, async () => {
  const { author, detail, issueId } = await setup();
  const before = (await detail()).updatedAt;
  const first = Date.UTC(2027, 2, 1);
  await author.client.mutation(api.routes.trips.issues.due.run, { dueAt: first, issueId });
  const set = await detail();
  expect(set.dueAt).toBe(first);
  expect(set.updatedAt).toBeGreaterThanOrEqual(before);

  const second = Date.UTC(2027, 2, 8);
  await author.client.mutation(api.routes.trips.issues.due.run, { dueAt: second, issueId });
  expect((await detail()).dueAt).toBe(second);

  await author.client.mutation(api.routes.trips.issues.due.run, { dueAt: null, issueId });
  expect((await detail()).dueAt).toBeNull();
});

test('a decide-by date is refused from other members and when invalid', { timeout }, async () => {
  const { author, detail, issueId, other } = await setup();
  await expect(
    other.client.mutation(api.routes.trips.issues.due.run, { dueAt: 1, issueId })
  ).rejects.toThrow('Only organizers or the author can set a decide-by date');
  for (const dueAt of [-1, Number.POSITIVE_INFINITY]) {
    await expect(
      author.client.mutation(api.routes.trips.issues.due.run, { dueAt, issueId })
    ).rejects.toThrow('Decide-by date is invalid');
  }
  expect((await detail()).dueAt).toBeNull();
});

test('any member comments; blank and oversized comments are refused', { timeout }, async () => {
  const { detail, issueId, other } = await setup();
  const comment = (content: string) =>
    other.client.mutation(api.routes.trips.issues.comment.run, { content, issueId });
  await comment('  How about the harbour place?  ');
  await expect(comment('   ')).rejects.toThrow('Issue comment must contain 1 to 2000 characters');
  await expect(comment('x'.repeat(2001))).rejects.toThrow(
    'Issue comment must contain 1 to 2000 characters'
  );
  expect((await detail()).comments).toEqual([
    expect.objectContaining({
      author: { name: 'Group member 2', userId: other.userId },
      content: 'How about the harbour place?',
      kind: 'comment'
    })
  ]);
});
