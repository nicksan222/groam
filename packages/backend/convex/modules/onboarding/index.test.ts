import { expect, test } from 'vite-plus/test';
import { api, components, internal } from '#convex-generated/api';
import { createTestAuthClient } from '#testing/auth/client';
import { createTest, createTestUser } from '#testing/factory';

test('signup creates a private Demo group with an editable example trip', async () => {
  const user = await createTestUser(createTest(), { email: 'explorer@example.com' });
  const { data: groups, error } = await user.authClient.organization.list();
  expect(error).toBeNull();
  expect(groups).toHaveLength(1);
  const group = groups?.[0];
  expect(group?.name).toBe('Demo group');
  if (!group) throw new Error('Expected the demo group');
  await user.authClient.organization.setActive({ organizationId: group.id });
  const trips = await user.client.query(api.routes.trips.list.run, {
    paginationOpts: { cursor: null, numItems: 10 }
  });
  expect(trips.page).toHaveLength(1);
  expect(trips.page[0]).toMatchObject({
    canParticipate: true,
    name: 'Demo: A long weekend in Rome'
  });
  const roster = await user.authClient.organization.getFullOrganization();
  expect(roster.data?.members).toMatchObject([{ userId: user.userId, role: 'owner' }]);
  await expect(
    user.client.mutation(api.routes.trips.packing.personal.add.run, {
      tripId: trips.page[0]!.id,
      label: 'My own walking shoes'
    })
  ).resolves.toBeTruthy();
});

async function demoUser(testInstance = createTest(), email = 'demo-owner@example.com') {
  const user = await createTestUser(testInstance, { email });
  const { data } = await user.authClient.organization.list();
  const group = data?.[0];
  if (!group) throw new Error('Expected a demo group');
  await user.authClient.organization.setActive({ organizationId: group.id });
  const trips = await user.client.query(api.routes.trips.list.run, {
    paginationOpts: { cursor: null, numItems: 10 }
  });
  const trip = trips.page[0];
  if (!trip) throw new Error('Expected a demo trip');
  return { ...user, group, trip, testInstance };
}

test('demo includes travel planning and terminal work from all four agents without AI workflows', async () => {
  const { client, trip } = await demoUser();
  const itinerary = await client.query(api.routes.trips.get.run, { tripId: trip.id });
  expect(itinerary.destinations[0]?.activities.length).toBeGreaterThan(0);
  expect(itinerary.destinations[0]?.stays.length).toBeGreaterThan(0);
  expect(itinerary.arrivalTransfer).not.toBeNull();
  const packing = await client.query(api.routes.trips.packing.list.run, { tripId: trip.id });
  expect(packing.length).toBeGreaterThan(0);
  const ideas = await client.query(api.routes.trips.versions.list.run, { tripId: trip.id });
  expect(ideas).toHaveLength(1);
  const idea = await client.query(api.routes.trips.versions.get.run, { proposalId: ideas[0]!.id });
  expect(idea.groamReview?.summary).toContain('Demo');
  expect(idea.changes.length).toBeGreaterThan(0);
  const issues = await client.query(api.routes.trips.issues.list.run, { tripId: trip.id });
  expect(issues.some((issue) => issue.assignee?.kind === 'agent')).toBe(true);
  expect(issues.find((issue) => issue.title === 'Book places to stay')?.status).toBe('closed');
  expect(issues.find((issue) => issue.title === 'Write the packing list')?.status).toBe('closed');
  const researches = await client.query(api.routes.discussions.research.list.run, {
    kind: 'research',
    tripId: trip.id
  });
  expect(researches).toHaveLength(1);
  const report = await client.query(api.routes.discussions.research.latest.run, {
    discussionId: researches[0]!.id
  });
  expect(report).toMatchObject({
    agentId: 'researcher',
    status: 'complete',
    report: expect.stringContaining('Demo')
  });
  for (const agentId of ['groam', 'issue', 'reviewer', 'researcher'] as const) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each catalog agent must have its own readable example.
    const runs = await client.query(api.routes.agents.runs.list.run, {
      agentId,
      paginationOpts: { cursor: null, numItems: 10 }
    });
    expect(runs.page).toHaveLength(1);
    expect(runs.page[0]).toMatchObject({
      status: 'complete',
      report: expect.stringContaining('Demo')
    });
  }
  const chats = await client.query(api.routes.assistant.chats.list.run, {});
  expect(chats).toHaveLength(1);
  const history = await client.query(api.routes.assistant.messages.run, {
    threadId: chats[0]!.id,
    paginationOpts: { cursor: null, numItems: 10 }
  });
  expect(history.page.some((message) => message.role === 'assistant')).toBe(true);
});

test('signup schedules no model work or external cover lookups', async () => {
  const user = await demoUser();
  const scheduled = await user.client.run((ctx) =>
    ctx.db.system.query('_scheduled_functions').take(50)
  );
  expect(scheduled).toEqual([]);
});

test('each signup owns isolated examples and cannot read another user’s trip or chat', async () => {
  const first = await demoUser();
  const second = await demoUser(first.testInstance, 'second-explorer@example.com');
  expect(second.group.id).not.toBe(first.group.id);
  expect(second.trip.id).not.toBe(first.trip.id);
  await expect(
    second.client.query(api.routes.trips.get.run, { tripId: first.trip.id })
  ).rejects.toThrow('Trip not found');
  const chats = await first.client.query(api.routes.assistant.chats.list.run, {});
  expect(chats).toHaveLength(1);
  await expect(
    second.client.query(api.routes.assistant.messages.run, {
      threadId: chats[0]!.id,
      paginationOpts: { cursor: null, numItems: 10 }
    })
  ).rejects.toThrow('Assistant conversation not found');
});

test('joining and activating an invited group wins over the demo and keeps its chat private', async () => {
  const owner = await demoUser();
  const invitee = await demoUser(owner.testInstance, 'invitee@example.com');
  const invitation = await owner.client.mutation(api.routes.organizations.invitations.create.run, {
    role: 'member'
  });
  const joined = await invitee.client.mutation(api.routes.organizations.invitations.redeem.run, {
    code: invitation.code
  });
  await invitee.authClient.organization.setActive({ organizationId: joined.organizationId });
  expect((await invitee.authClient.getSession()).data?.session.activeOrganizationId).toBe(
    owner.group.id
  );
  const chats = await owner.client.query(api.routes.assistant.chats.list.run, {});
  await expect(
    invitee.client.query(api.routes.assistant.messages.run, {
      threadId: chats[0]!.id,
      paginationOpts: { cursor: null, numItems: 10 }
    })
  ).rejects.toThrow('Discussion not found');
  expect(await invitee.client.query(api.routes.assistant.chats.list.run, {})).toEqual([]);
});

test('repeat initialization preserves edits and never restores a deleted demo group', async () => {
  const { authClient, group, userId, testInstance } = await demoUser();
  await authClient.organization.update({
    data: { name: 'My edited demo' },
    organizationId: group.id
  });
  await testInstance.mutation(internal.modules.onboarding.index.initialize, { userId });
  const renamed = await authClient.organization.list();
  expect(renamed.data).toMatchObject([{ id: group.id, name: 'My edited demo' }]);
  await authClient.organization.delete({ organizationId: group.id });
  await testInstance.mutation(internal.modules.onboarding.index.initialize, { userId });
  expect((await authClient.organization.list()).data).toEqual([]);
  await authClient.signOut();
  const login = createTestAuthClient(testInstance);
  const signedIn = await login.client.signIn.email({
    email: 'demo-owner@example.com',
    password: 'Test-password-1234'
  });
  expect(signedIn.error).toBeNull();
  if (!signedIn.data?.token) throw new Error('Expected a new session');
  login.setSessionToken(signedIn.data.token);
  expect((await login.client.organization.list()).data).toEqual([]);
});

test('a failed initialization rolls back component and app writes and can be retried', async () => {
  const testInstance = createTest({ transactionLimits: true });
  const user = await testInstance.mutation(components.betterAuth.adapter.create, {
    input: {
      model: 'user',
      data: {
        name: 'Rollback User',
        email: 'rollback@example.com',
        emailVerified: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }
  });
  await expect(
    testInstance.run((ctx) =>
      ctx.runMutation(
        internal.modules.onboarding.index.initialize,
        { userId: user._id },
        { transactionLimits: { documentsWritten: 3 } }
      )
    )
  ).rejects.toThrow(/limit|write/i);
  const groups = await testInstance.query(components.betterAuth.adapter.findMany, {
    model: 'organization',
    paginationOpts: { cursor: null, numItems: 10 }
  });
  expect(groups.page).toEqual([]);
  await testInstance.mutation(internal.modules.onboarding.index.initialize, { userId: user._id });
  const retried = await testInstance.query(components.betterAuth.adapter.findMany, {
    model: 'organization',
    paginationOpts: { cursor: null, numItems: 10 }
  });
  expect(retried.page).toHaveLength(1);
});
