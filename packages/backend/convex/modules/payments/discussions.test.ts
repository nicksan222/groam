import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { setupTrip } from '#testing/trips';

const list = api.routes.discussions.list.run;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function enablePayments() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_chats');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_chats');
}
async function linkedChats() {
  const fixture = await setupTrip(1);
  const member = fixture.users[0]!;
  const linked = await fixture.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Private protected trip conversation',
    tripId: fixture.tripId
  });
  await fixture.owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId: linked,
    text: 'Private latest message'
  });
  const unlinked = await fixture.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Ordinary group conversation'
  });
  return { ...fixture, member, linked, unlinked };
}

test('global Chats omits protected trip-linked conversation previews for unpaid members', async () => {
  enablePayments();
  const { owner, member, linked, unlinked } = await linkedChats();
  const ownerItems = await owner.client.query(list, {});
  expect(ownerItems.map((item) => item.id)).toContain(linked);
  expect(JSON.stringify(ownerItems)).toContain('Private latest message');
  const unpaidItems = await member.client.query(list, {});
  expect(unpaidItems.map((item) => item.id)).toEqual([unlinked]);
  const payload = JSON.stringify(unpaidItems);
  expect(payload).not.toContain(linked);
  expect(payload).not.toContain('Private protected trip conversation');
  expect(payload).not.toContain('Private latest message');
  await expect(
    member.client.query(api.routes.discussions.messages.list.run, {
      discussionId: linked,
      threadId: ownerItems.find((item) => item.id === linked)!.threadId!,
      paginationOpts: { cursor: null, numItems: 10 }
    })
  ).rejects.toThrow('Discussion not found');
});

test.each(['paid', 'disabled', 'legacy'])(
  '%s members retain linked conversation previews',
  async (access) => {
    if (access === 'legacy') vi.stubEnv('STRIPE_SECRET_KEY', '');
    else enablePayments();
    const { owner, member, linked, unlinked, tripId } = await linkedChats();
    if (access === 'legacy') enablePayments();
    if (access === 'disabled') vi.stubEnv('STRIPE_SECRET_KEY', '');
    if (access === 'paid') {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          Response.json({
            id: 'cs_chats',
            url: null,
            status: 'complete',
            payment_status: 'paid',
            amount_total: 100,
            currency: 'eur',
            metadata: {}
          })
        )
      );
      expect(
        await owner.client.action(api.routes.trips.payments.checkout.run, {
          tripId,
          userId: member.userId
        })
      ).toEqual({ skipped: true, url: null });
    }
    const items = await member.client.query(list, {});
    expect(new Set(items.map((item) => item.id))).toEqual(new Set([linked, unlinked]));
    expect(JSON.stringify(items)).toContain('Private latest message');
    expect(items.find((item) => item.id === linked)?.tripId).toBe(tripId);
  }
);
