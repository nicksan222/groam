import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { MIN_RANK_GAP } from '#convex/modules/travel/issues/board';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip, tripInput } from '#testing/trips';

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

test('move reorders inside a lane without a comment or updatedAt bump', { timeout }, async () => {
  const { issueId, owner, tripId } = await setup();
  const before = await detail(owner.client, issueId);
  const lane = await orderOf(owner.client, tripId, 'open');
  const [first, second] = lane;
  if (!(first && second)) throw new Error('Expected a lane');
  await owner.client.mutation(api.routes.trips.issues.move.run, {
    afterIssueId: second,
    beforeIssueId: first,
    issueId,
    status: 'open'
  });
  const order = await orderOf(owner.client, tripId, 'open');
  expect(order.slice(0, 3)).toEqual([first, issueId, second]);
  const after = await detail(owner.client, issueId);
  expect(after?.comments).toEqual([]);
  expect(after?.updatedAt).toBe(before?.updatedAt);
});

test('move supports top, bottom, and a single neighbor', { timeout }, async () => {
  const { issueId, owner, tripId } = await setup();
  const move = (extra: { afterIssueId?: Id<'tripIssues'>; beforeIssueId?: Id<'tripIssues'> }) =>
    owner.client.mutation(api.routes.trips.issues.move.run, { issueId, status: 'open', ...extra });
  const others = (await orderOf(owner.client, tripId, 'open')).filter((id) => id !== issueId);
  const [first, second] = others;
  if (!(first && second)) throw new Error('Expected others');
  await move({ afterIssueId: first });
  expect((await orderOf(owner.client, tripId, 'open'))[0]).toBe(issueId);
  await move({ beforeIssueId: first });
  expect((await orderOf(owner.client, tripId, 'open')).slice(0, 2)).toEqual([first, issueId]);
  await move({});
  expect((await orderOf(owner.client, tripId, 'open')).at(-1)).toBe(issueId);
});

test('move across lanes sets status and leaves one comment', { timeout }, async () => {
  const { issueId, owner, tripId } = await setup();
  await owner.client.mutation(api.routes.trips.issues.move.run, { issueId, status: 'wont_do' });
  const moved = await detail(owner.client, issueId);
  expect(moved).toMatchObject({ closedAt: expect.any(Number), status: 'wont_do' });
  expect(moved?.comments).toMatchObject([
    { content: "Test Person marked this as won't do", kind: 'system' }
  ]);
  await owner.client.mutation(api.routes.trips.issues.move.run, {
    issueId,
    status: 'in_progress'
  });
  await expect(detail(owner.client, issueId)).resolves.toMatchObject({
    closedAt: null,
    status: 'in_progress'
  });
  expect(await orderOf(owner.client, tripId, 'in_progress')).toEqual([issueId]);
});

test('a status change without placement appends to the target lane', { timeout }, async () => {
  const { issueId, owner, tripId } = await setup();
  const second = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Another.',
    title: 'Second',
    tripId
  });
  const set = (id: Id<'tripIssues'>) =>
    owner.client.mutation(api.routes.trips.issues.status.run, {
      issueId: id,
      status: 'in_progress'
    });
  await set(second);
  await set(issueId);
  expect(await orderOf(owner.client, tripId, 'in_progress')).toEqual([second, issueId]);
  // Reopening lands at the bottom of the open lane.
  await owner.client.mutation(api.routes.trips.issues.status.run, {
    issueId: second,
    status: 'open'
  });
  expect((await orderOf(owner.client, tripId, 'open')).at(-1)).toBe(second);
});

test('stale neighbors degrade, foreign ones are refused', { timeout }, async () => {
  const { issueId, owner, tripId } = await setup();
  const [laneMate] = (await orderOf(owner.client, tripId, 'open')).filter((id) => id !== issueId);
  if (!laneMate) throw new Error('Expected a neighbor');
  const move = (extra: {
    afterIssueId?: Id<'tripIssues'>;
    beforeIssueId?: Id<'tripIssues'>;
    status?: 'in_progress' | 'open';
  }) =>
    owner.client.mutation(api.routes.trips.issues.move.run, {
      issueId,
      ...extra,
      status: extra.status ?? 'open'
    });
  // The neighbor is in another lane (it changed lanes since the drop was planned): append.
  await move({ beforeIssueId: laneMate, status: 'in_progress' });
  expect(await orderOf(owner.client, tripId, 'in_progress')).toEqual([issueId]);
  // A stale before falls back to after, then to the bottom.
  const [target] = (await orderOf(owner.client, tripId, 'open')).filter((id) => id !== laneMate);
  if (!target) throw new Error('Expected a second neighbor');
  await owner.client.mutation(api.routes.trips.issues.status.run, {
    issueId: laneMate,
    status: 'in_progress'
  });
  await move({ afterIssueId: target, beforeIssueId: laneMate });
  const lane = await orderOf(owner.client, tripId, 'open');
  expect(lane[lane.indexOf(target) - 1]).toBe(issueId);
  await expect(move({ afterIssueId: issueId })).rejects.toThrow('next to itself');
  const otherTrip = await owner.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  const [foreign] = await orderOf(owner.client, otherTrip, 'open');
  if (!foreign) throw new Error('Expected a foreign issue');
  await expect(move({ beforeIssueId: foreign })).rejects.toThrow('not on this trip');
  // A trip in another group of the same deployment, so its issue ids are real but foreign.
  const outsider = await createOutsiderClient(owner.test);
  const alienTrip = await outsider.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  const [alien] = await orderOf(outsider.client, alienTrip, 'open');
  if (!alien) throw new Error('Expected an alien issue');
  await expect(move({ afterIssueId: alien })).rejects.toThrow('not on this trip');
});

test.each([
  ['an organizer', 'owner', false, { canAssign: true, canManage: true }],
  ['the author', 'member', false, { canAssign: false, canManage: true }],
  ['another member', 'other', false, { canAssign: false, canManage: false }],
  ['an organizer on an archived trip', 'owner', true, { canAssign: false, canManage: false }],
  ['the author on an archived trip', 'member', true, { canAssign: false, canManage: false }]
] as const)(
  '%s gets the same flags from every read',
  { timeout },
  async (_name, who, archived, flags) => {
    const context = await setup();
    const { client } = context[who];
    const { issueId, tripId } = context;
    if (archived) await context.owner.client.mutation(api.routes.trips.archive.run, { tripId });

    const [listed, workspace, fromDetail] = await Promise.all([
      client.query(api.routes.trips.issues.list.run, { tripId }),
      client.query(api.routes.trips.issues.workspace.list.run, {
        paginationOpts: { cursor: null, numItems: 25 }
      }),
      detail(client, issueId)
    ]);
    const pick = (issue: { canAssign: boolean; canManage: boolean } | null | undefined) => ({
      canAssign: issue?.canAssign,
      canManage: issue?.canManage
    });
    expect(pick(listed.find((issue) => issue.id === issueId))).toEqual(flags);
    expect(pick(workspace.page.find((issue) => issue.id === issueId))).toEqual(flags);
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
  ],
  [
    'moving',
    ({ issueId, owner }) =>
      owner.client.mutation(api.routes.trips.issues.move.run, { issueId, status: 'open' })
  ]
])('refuses %s on an archived trip', { timeout }, async (_name, write) => {
  const context = await setup();
  await context.owner.client.mutation(api.routes.trips.archive.run, { tripId: context.tripId });

  await expect(write(context)).rejects.toThrow('Archived trips are read-only');
  await expect(detail(context.owner.client, context.issueId)).resolves.toMatchObject({
    status: 'open'
  });
});

test.each([
  ['neighbors closer than the minimum gap', MIN_RANK_GAP / 2],
  ['tied neighbors', 0]
])('renumbers a lane when dropping between %s', { timeout }, async (_name, spread) => {
  const { issueId, owner, tripId } = await setup();
  const lane = await orderOf(owner.client, tripId, 'open');
  const neighbors = lane.filter((id) => id !== issueId);
  const ranks = neighbors.map((_, index) => (index === 1 ? 10 + spread : 10 * (index + 1)));
  await owner.client.run(async (ctx) => {
    for (const [index, id] of neighbors.entries()) {
      await ctx.db.patch('tripIssues', id, { boardRank: ranks[index] });
    }
    await ctx.db.patch('tripIssues', issueId, { boardRank: 10 * (neighbors.length + 1) });
  });
  const [above, below, ...rest] = await orderOf(owner.client, tripId, 'open');

  await owner.client.mutation(api.routes.trips.issues.move.run, {
    afterIssueId: below,
    beforeIssueId: above,
    issueId,
    status: 'open'
  });

  const moved = (await owner.client.query(api.routes.trips.issues.list.run, { tripId })).filter(
    (issue) => issue.status === 'open'
  );
  expect(moved.map((issue) => issue.id)).toEqual([above, issueId, below, ...rest.slice(0, -1)]);
  for (const [index, issue] of moved.entries()) {
    const next = moved[index + 1];
    if (next) expect(next.rank - issue.rank).toBeGreaterThanOrEqual(MIN_RANK_GAP);
  }
});

test('orders equal ranks by creation time', { timeout }, async () => {
  const { issueId, owner, tripId } = await setup();
  const second = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Another.',
    title: 'Second',
    tripId
  });
  await owner.client.run(async (ctx) => {
    await ctx.db.patch('tripIssues', second, { boardRank: 5 });
    await ctx.db.patch('tripIssues', issueId, { boardRank: 5 });
  });
  const order = await orderOf(owner.client, tripId, 'open');
  expect(order.indexOf(issueId)).toBeLessThan(order.indexOf(second));
});

test('only the author or an organizer may change status or move', { timeout }, async () => {
  const { issueId, member, other, owner } = await setup();
  await expect(
    other.client.mutation(api.routes.trips.issues.move.run, { issueId, status: 'closed' })
  ).rejects.toThrow('Only the issue author or an organizer');
  await expect(
    other.client.mutation(api.routes.trips.issues.status.run, { issueId, status: 'closed' })
  ).rejects.toThrow('Only the issue author or an organizer');
  await member.client.mutation(api.routes.trips.issues.move.run, {
    issueId,
    status: 'in_progress'
  });
  await owner.client.mutation(api.routes.trips.issues.move.run, { issueId, status: 'closed' });
  await expect(detail(owner.client, issueId)).resolves.toMatchObject({ status: 'closed' });
});

test('appends new issues to the bottom of the open lane', { timeout }, async () => {
  const { issueId, owner, tripId } = await setup();
  const next = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Another one.',
    title: 'Second dinner',
    tripId
  });
  const order = await orderOf(owner.client, tripId, 'open');
  expect(order.at(-1)).toBe(next);
  expect(order).toContain(issueId);
  // A closed issue does not hold the append position.
  await owner.client.mutation(api.routes.trips.issues.status.run, {
    issueId: next,
    status: 'closed'
  });
  const third = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Third.',
    title: 'Third dinner',
    tripId
  });
  expect((await orderOf(owner.client, tripId, 'open')).at(-1)).toBe(third);
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
