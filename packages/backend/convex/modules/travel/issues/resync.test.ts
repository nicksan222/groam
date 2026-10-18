import { expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { setupTrip } from '#testing/trips';

test('membership changes re-check travelers-going rules', { timeout: 30_000 }, async () => {
  vi.useFakeTimers();
  try {
    const { addUser, owner, tripId, users } = await setupTrip(1);
    const [member] = users;
    const organizationId = owner.organizationId;
    if (!member || !organizationId) throw new Error('Expected a member and organization');
    const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Wait for the group.',
      rule: { items: [{ count: 3, kind: 'travelers_going' }], match: 'all' },
      title: 'Enough people',
      tripId
    });
    const statusOf = async () =>
      (await owner.client.query(api.routes.trips.issues.get.run, { issueId }))?.status;
    const systemComments = async () =>
      (await owner.client.query(api.routes.trips.issues.get.run, { issueId }))?.comments.filter(
        ({ kind }) => kind === 'system'
      );
    const settle = async () => await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
    const remove = async (userId: string) => {
      const full = await owner.authClient.organization.getFullOrganization({
        query: { organizationId }
      });
      const membership = full.data?.members.find((row) => row.userId === userId);
      if (!membership) throw new Error('Expected the member row');
      const removed = await owner.authClient.organization.removeMember({
        memberIdOrEmail: membership.id,
        organizationId
      });
      if (removed.error) throw new Error(removed.error.message ?? 'Unable to remove member');
      await settle();
    };
    await settle();
    expect(await statusOf()).toBe('open');

    await addUser('Third traveler');
    await settle();
    expect(await statusOf()).toBe('closed');
    const settled = await systemComments();
    expect(settled?.map(({ content }) => content)).toEqual([
      'Resolved automatically: At least 3 travelers are going'
    ]);

    // Roster changes that keep the rule met re-check without moving or commenting.
    const fourth = await addUser('Fourth traveler');
    await settle();
    expect(await statusOf()).toBe('closed');
    await remove(fourth.userId);
    expect(await statusOf()).toBe('closed');
    expect(await systemComments()).toEqual(settled);

    await remove(member.userId);
    expect(await statusOf()).toBe('open');
    expect((await systemComments())?.at(-1)?.content).toBe(
      'Reopened automatically: At least 3 travelers are going no longer holds'
    );
  } finally {
    vi.useRealTimers();
  }
});
