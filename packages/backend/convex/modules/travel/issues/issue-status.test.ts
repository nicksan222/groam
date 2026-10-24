import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { setupTrip } from '#testing/trips';

const timeout = 20_000;

async function setup() {
  const trip = await setupTrip(2);
  const [member, other] = trip.users;
  if (!(member && other)) throw new Error('Expected members');
  const issueId = await member.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Pick a restaurant for the first night.',
    title: 'First dinner',
    tripId: trip.tripId
  });
  return { ...trip, issueId, member, other };
}

type Client = Awaited<ReturnType<typeof setup>>['owner']['client'];

const detail = (client: Client, issueId: Id<'tripIssues'>) =>
  client.query(api.routes.trips.issues.get.run, { issueId });

type Status = 'closed' | 'in_progress' | 'open' | 'wont_do';

test.each<[Status, Status, 'cleared' | 'kept' | 'set']>([
  ['open', 'in_progress', 'cleared'],
  ['open', 'closed', 'set'],
  ['open', 'wont_do', 'set'],
  ['closed', 'wont_do', 'kept'],
  ['wont_do', 'closed', 'kept'],
  ['closed', 'open', 'cleared'],
  ['wont_do', 'in_progress', 'cleared']
])('moving %s to %s leaves closedAt %s', { timeout }, async (from, to, closedAt) => {
  const { issueId, owner } = await setup();
  const set = (status: Status) =>
    owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status });
  if (from !== 'open') await set(from);
  const before = await detail(owner.client, issueId);

  await set(to);

  const after = await detail(owner.client, issueId);
  expect(after?.status).toBe(to);
  expect(after?.updatedAt).toBeGreaterThanOrEqual(before?.updatedAt ?? 0);
  if (closedAt === 'cleared') expect(after?.closedAt).toBeNull();
  if (closedAt === 'set') expect(after?.closedAt).toEqual(expect.any(Number));
  if (closedAt === 'kept') expect(after?.closedAt).toBe(before?.closedAt);
  expect(after?.comments.at(-1)).toMatchObject({ kind: 'system' });
});

test('setting the same status again writes nothing', { timeout }, async () => {
  const { issueId, owner } = await setup();
  const before = await detail(owner.client, issueId);
  await owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'open' });
  const after = await detail(owner.client, issueId);
  expect(after?.comments).toEqual([]);
  expect(after?.updatedAt).toBe(before?.updatedAt);
});

const orderOf = async (client: Client, tripId: Id<'trips'>, status: string) =>
  (await client.query(api.routes.trips.issues.list.run, { tripId }))
    .filter((issue) => issue.status === status)
    .map((issue) => issue.id);

test('a status change leaves one comment and tracks closedAt', { timeout }, async () => {
  const { issueId, owner, tripId } = await setup();
  await owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'wont_do' });
  const moved = await detail(owner.client, issueId);
  expect(moved).toMatchObject({ closedAt: expect.any(Number), status: 'wont_do' });
  expect(moved?.comments).toMatchObject([
    { content: "Test Person marked this as won't do", kind: 'system' }
  ]);
  await owner.client.mutation(api.routes.trips.issues.status.run, {
    issueId,
    status: 'in_progress'
  });
  await expect(detail(owner.client, issueId)).resolves.toMatchObject({
    closedAt: null,
    status: 'in_progress'
  });
  expect(await orderOf(owner.client, tripId, 'in_progress')).toEqual([issueId]);
});

test.each([
  ['an organizer', 'owner', false, { canAssign: true, canManage: true }],
  ['the author', 'member', false, { canAssign: false, canManage: true }],
  ['another member', 'other', false, { canAssign: false, canManage: false }],
  ['an organizer on an archived trip', 'owner', true, { canAssign: false, canManage: false }],
  ['the author on an archived trip', 'member', true, { canAssign: false, canManage: false }]
] as const)(
  '%s gets the same flags from the list and the detail',
  { timeout },
  async (_name, who, archived, flags) => {
    const context = await setup();
    const { client } = context[who];
    const { issueId, tripId } = context;
    if (archived) await context.owner.client.mutation(api.routes.trips.archive.run, { tripId });

    const [listed, fromDetail] = await Promise.all([
      client.query(api.routes.trips.issues.list.run, { tripId }),
      detail(client, issueId)
    ]);
    const pick = (issue: { canAssign: boolean; canManage: boolean } | null | undefined) => ({
      canAssign: issue?.canAssign,
      canManage: issue?.canManage
    });
    expect(pick(listed.find((issue) => issue.id === issueId))).toEqual(flags);
    expect(pick(fromDetail)).toEqual(flags);
    // Any member may comment until the trip is archived, whatever their other flags.
    expect(fromDetail?.canComment).toBe(!archived);
  }
);

test.each<[string, (context: Awaited<ReturnType<typeof setup>>) => Promise<unknown>]>([
  [
    'creating an issue',
    ({ owner, tripId }) =>
      owner.client.mutation(api.routes.trips.issues.create.run, {
        body: 'No.',
        title: 'Archived',
        tripId
      })
  ],
  [
    'assigning',
    ({ issueId, owner }) =>
      owner.client.mutation(api.routes.trips.issues.assign.run, {
        assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' },
        issueId
      })
  ],
  [
    'changing status',
    ({ issueId, owner }) =>
      owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' })
  ],
  [
    'commenting',
    ({ issueId, member }) =>
      member.client.mutation(api.routes.trips.issues.comment.run, { content: 'Late', issueId })
  ],
  [
    'setting a decide-by date',
    ({ issueId, owner }) =>
      owner.client.mutation(api.routes.trips.issues.due.run, {
        dueAt: Date.UTC(2027, 0, 1),
        issueId
      })
  ],
  [
    'setting a done-when condition',
    ({ issueId, member }) =>
      member.client.mutation(api.routes.trips.issues.condition.run, {
        doneWhen: 'Booked',
        issueId
      })
  ]
])('refuses %s on an archived trip', { timeout }, async (_name, write) => {
  const context = await setup();
  await context.owner.client.mutation(api.routes.trips.archive.run, { tripId: context.tripId });

  await expect(write(context)).rejects.toThrow('Archived trips are read-only');
  await expect(detail(context.owner.client, context.issueId)).resolves.toMatchObject({
    status: 'open'
  });
});

test('only the author or an organizer may change status', { timeout }, async () => {
  const { issueId, member, other, owner } = await setup();
  await expect(
    other.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' })
  ).rejects.toThrow('Only the issue author or an organizer');
  await expect(
    other.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' })
  ).rejects.toThrow('Only the issue author or an organizer');
  await member.client.mutation(api.routes.trips.issues.status.run, {
    issueId,
    status: 'in_progress'
  });
  await owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' });
  await expect(detail(owner.client, issueId)).resolves.toMatchObject({ status: 'closed' });
});

test('system comments do not use the human comment budget', { timeout }, async () => {
  const { issueId, owner } = await setup();
  const seed = (kind: 'comment' | 'system', count: number) =>
    owner.client.run(async (ctx) => {
      const issue = await ctx.db.get('tripIssues', issueId);
      if (!issue) throw new Error('Expected issue');
      for (let index = 0; index < count; index += 1) {
        await ctx.db.insert('tripIssueComments', {
          author: issue.author,
          content: `${kind} ${index}`,
          issueId,
          kind,
          organizationId: issue.organizationId,
          tripId: issue.tripId,
          updatedAt: Date.now()
        });
      }
      const field = kind === 'comment' ? 'humanCommentCount' : 'systemCommentCount';
      await ctx.db.patch('tripIssues', issueId, { [field]: issue[field] + count });
    });
  const add = () =>
    owner.client.mutation(api.routes.trips.issues.comment.run, { content: 'Hello', issueId });
  await seed('system', 200);
  await seed('comment', 199);
  await add();
  await expect(add()).rejects.toThrow('up to 200 comments');
  // Human comments being full does not block status events, and the detail still loads.
  await owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' });
  const comments = (await detail(owner.client, issueId))?.comments ?? [];
  expect(comments.filter((comment) => comment.kind === 'comment')).toHaveLength(200);
  // The system cap is separate: 200 already, so the status event was dropped quietly.
  expect(comments.filter((comment) => comment.kind === 'system')).toHaveLength(200);
});

test('counts comments by kind as they are written', { timeout }, async () => {
  const { issueId, owner } = await setup();
  await owner.client.mutation(api.routes.trips.issues.comment.run, { content: 'Hello', issueId });
  await owner.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' });
  await expect(owner.client.run((ctx) => ctx.db.get('tripIssues', issueId))).resolves.toMatchObject(
    { humanCommentCount: 1, systemCommentCount: 1 }
  );
});
