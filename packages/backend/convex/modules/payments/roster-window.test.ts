import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import {
  queuePreviewDiscussionRun,
  seedRosterAuthorizationWindows,
  seedRosterIssueSources
} from '#testing/agent-preview';
import { confirmFixtureSeats, inviteFixtureTravelers, setupBillableTrip } from '#testing/payments';
import { tripInput } from '#testing/trips';

const roster = api.routes.agents.list.run;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function fixture(hiddenCount: number, newestVisible = false) {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_roster');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_roster');
  const group = await setupBillableTrip(1);
  const member = group.users[0]!;
  const freeChat = await group.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Accessible conversation'
  });
  const hiddenChat = await group.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    tripId: group.tripId,
    title: 'Protected conversation'
  });
  const chats = await group.owner.client.query(api.routes.discussions.list.run, {});
  const queue = async (discussionId: typeof freeChat, title: string) => {
    const threadId = chats.find((chat) => chat.id === discussionId)?.threadId;
    if (!threadId) throw new Error('Expected fixture thread');
    return group.owner.test.run((ctx) =>
      AgentRuns.queueDiscussionTurn(ctx, {
        discussionId,
        threadId,
        title,
        agentId: 'groam',
        organizationId: group.owner.organizationId!,
        createdBy: { userId: group.owner.userId, name: 'Owner' }
      })
    );
  };
  const visibleId = await queue(freeChat, 'Older accessible activity');
  for (let index = 0; index < hiddenCount; index += 1) {
    await queue(hiddenChat, `Protected activity ${index}`);
  }
  const latestVisible = newestVisible
    ? await queue(freeChat, 'Newest accessible activity')
    : visibleId;
  return { ...group, member, queue, freeChat, latestVisible };
}

test('21 newer inaccessible runs do not hide an older accessible active run', async () => {
  const group = await fixture(21);
  const agents = await group.member.client.query(roster, {});
  expect(agents.find((agent) => agent.id === 'groam')).toMatchObject({
    status: 'working',
    activeRunCount: 1,
    runWindowIncomplete: false,
    latestRun: { id: group.latestVisible, title: 'Older accessible activity' }
  });
  expect(agents.find((agent) => agent.id === 'issue')).toMatchObject({
    status: 'idle',
    activeRunCount: 0,
    runWindowIncomplete: false,
    latestRun: null
  });
  const seat = (await group.owner.client.mutation(internal.modules.payments.storage.prepare, {
    tripId: group.tripId,
    userId: group.member.userId
  }))!;
  await group.owner.client.mutation(internal.modules.payments.storage.complete, {
    id: seat.id,
    attempt: seat.attempt,
    sessionId: 'cs_roster'
  });
  expect(
    (await group.member.client.query(roster, {})).find((agent) => agent.id === 'groam')
  ).toMatchObject({
    status: 'working',
    activeRunCount: 20,
    runWindowIncomplete: false,
    latestRun: { title: 'Protected activity 20' }
  });
});

test.each([false, true])(
  'bounded history reports incomplete honestly, preserving visible activity: %s',
  async (newestVisible) => {
    const group = await fixture(201, newestVisible);
    const agent = (await group.member.client.query(roster, {})).find((item) => item.id === 'groam');
    expect(agent).toMatchObject({
      status: newestVisible ? 'working' : 'unknown',
      activeRunCount: null,
      runWindowIncomplete: true
    });
    if (newestVisible) expect(agent?.latestRun?.id).toBe(group.latestVisible);
    else expect(agent?.latestRun).toBeNull();
    const page = await group.member.client.query(api.routes.agents.runs.list.run, {
      agentId: 'groam',
      paginationOpts: { cursor: null, numItems: 20 }
    });
    expect(page.isDone).toBe(false);
    expect(page.continueCursor).toBeTruthy();
  }
);

test('disabled payments grant trip activity but do not grant private discussion audiences', async () => {
  const group = await fixture(21);
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const visible = (await group.member.client.query(roster, {})).find(
    (agent) => agent.id === 'groam'
  );
  expect(visible).toMatchObject({
    activeRunCount: 20,
    status: 'working',
    runWindowIncomplete: false
  });
  const threadId = await group.owner.client.action(api.routes.assistant.chats.create.run, {
    screen: {
      capabilities: [],
      data: '{}',
      description: 'Home',
      key: 'home',
      target: { kind: 'workspace' },
      title: 'Home'
    }
  });
  for (let index = 0; index < 25; index += 1) {
    await queuePreviewDiscussionRun(group.owner.test, {
      threadId,
      userId: group.owner.userId,
      organizationId: group.owner.organizationId!
    });
  }
  expect(
    (await group.member.client.query(roster, {})).find((agent) => agent.id === 'groam')
  ).toMatchObject({
    activeRunCount: 20,
    status: 'working',
    latestRun: { id: visible?.latestRun?.id },
    runWindowIncomplete: false
  });
});

test('a capped issue window reports an unknown assignment count instead of hiding older assignments', async () => {
  const group = await fixture(0);
  const accessibleTrip = await group.member.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  const issueId = await group.member.client.mutation(api.routes.trips.issues.create.run, {
    tripId: accessibleTrip,
    title: 'Older accessible assignment',
    body: 'Accessible work'
  });
  await group.member.client.mutation(api.routes.trips.issues.assign.run, {
    issueId,
    assignee: { kind: 'agent', agentId: 'issue', name: 'Issue agent' }
  });
  const hiddenTrips = [group.tripId];
  const extraTrips = await Promise.all(
    [0, 1].map(() => group.owner.client.action(api.routes.trips.create.run, { input: tripInput() }))
  );
  await Promise.all(extraTrips.map((tripId) => inviteFixtureTravelers(group.owner, tripId)));
  hiddenTrips.push(...extraTrips);
  for (let index = 0; index < 501; index += 1) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Newer protected issues must sort after the older accessible assignment.
    await group.owner.client.mutation(api.routes.trips.issues.create.run, {
      tripId: hiddenTrips[Math.floor(index / 180)]!,
      title: `Hidden issue ${index}`,
      body: 'Protected work'
    });
  }
  const agent = (await group.member.client.query(roster, {})).find((item) => item.id === 'issue');
  expect(agent).toMatchObject({ assignedIssueCount: null, issueWindowIncomplete: true });
});

test('an exactly exhausted 200-candidate history is complete rather than unknown', async () => {
  const group = await fixture(199);
  expect(
    (await group.member.client.query(roster, {})).find((agent) => agent.id === 'groam')
  ).toMatchObject({
    activeRunCount: 1,
    status: 'working',
    runWindowIncomplete: false,
    latestRun: { id: group.latestVisible }
  });
});

test('roster shares a bounded authorization budget across all agent windows', async () => {
  const group = await fixture(0);
  await confirmFixtureSeats(group.owner, group.tripId, [group.member.userId]);
  const idea = await group.owner.client.mutation(api.routes.trips.versions.create.run, {
    tripId: group.tripId
  });
  await seedRosterAuthorizationWindows(group.owner.test, {
    seedRunId: group.latestVisible,
    workingTripId: idea.workingTripId,
    countPerAgent: 201
  });
  await seedRosterIssueSources(group.owner.test, group.tripId);
  const { agents, metrics } = await group.member.client.run(async (ctx) => {
    const agents = await ctx.runQuery(roster, {}, { transactionLimits: { databaseQueries: 4096 } });
    return { agents, metrics: await ctx.meta.getTransactionMetrics() };
  });
  // Measured 2804 ranges with 200 worst-case conversation checks and 500 distinct issue trips.
  expect(metrics.databaseQueries.used).toBeLessThan(3400);
  expect(
    agents.every(
      (agent) =>
        agent.runWindowIncomplete && agent.activeRunCount === null && agent.status === 'unknown'
    )
  ).toBe(true);
});
