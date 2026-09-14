import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { openTripDraft, setupTrip } from '#testing/trips';

type Actor = Pick<Awaited<ReturnType<typeof setupTrip>>['owner'], 'client'>;

async function approveAndApply(
  author: Actor,
  reviewer: Actor,
  proposalId: Id<'tripProposals'>,
  organizer: Actor = author
) {
  await author.client.action(api.routes.trips.versions.submit.run, { proposalId });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId
  });
  return organizer.client.action(api.routes.trips.versions.merge.run, { proposalId });
}

async function setupPackingPlan() {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  const idea = await openTripDraft(owner, tripId);
  for (const label of ['Passport', 'Hat']) {
    await owner.client.mutation(api.routes.trips.packing.add.run, {
      label,
      tripId: idea.workingTripId
    });
  }
  expect(await approveAndApply(owner, reviewer, idea.proposalId)).toBe('applied');
  const items = await owner.client.query(api.routes.trips.packing.list.run, { tripId });
  const [passport, hat] = items;
  if (!passport || !hat) throw new Error('Expected packing items');
  return { owner, reviewer, tripId, passport, hat, items };
}

test('packing additions produce normal diffs and require approval to apply', {
  timeout: 15_000
}, async () => {
  const { owner, tripId, users } = await setupTrip(1);
  const reviewer = users[0];
  if (!reviewer) throw new Error('Expected reviewer');
  const idea = await openTripDraft(owner, tripId);
  const item = await owner.client.mutation(api.routes.trips.packing.add.run, {
    label: 'Passport',
    tripId: idea.workingTripId
  });
  const proposal = await owner.client.query(api.routes.trips.versions.get.run, {
    proposalId: idea.proposalId
  });
  expect(proposal.changes).toMatchObject([
    {
      change: 'added',
      entity: 'packing',
      key: `packing/${item.id}.json`,
      label: 'Passport',
      fields: [
        { key: 'label', label: 'Item', after: 'Passport' },
        { key: 'packed', label: 'Packed', after: false }
      ]
    }
  ]);
  await owner.client.action(api.routes.trips.versions.submit.run, { proposalId: idea.proposalId });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, {
      proposalId: idea.proposalId
    })
  ).rejects.toThrow('needs 1 approval');
  await expect(owner.client.query(api.routes.trips.packing.list.run, { tripId })).resolves.toEqual(
    []
  );
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: idea.proposalId
  });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, {
      proposalId: idea.proposalId
    })
  ).resolves.toBe('applied');
  await expect(
    owner.client.query(api.routes.trips.packing.list.run, { tripId })
  ).resolves.toMatchObject([{ label: 'Passport', packed: false }]);
  await expect(
    owner.client.mutation(api.routes.trips.packing.update.run, {
      itemId: item.id,
      packed: true,
      tripId: idea.workingTripId
    })
  ).rejects.toThrow('Closed ideas are read-only');
});

test('clones packing with stable file keys and applies renames, check-offs, and removals', {
  timeout: 15_000
}, async () => {
  const { owner, reviewer, tripId, passport, hat, items } = await setupPackingPlan();
  const idea = await openTripDraft(owner, tripId);
  const copy = await owner.client.query(api.routes.trips.packing.list.run, {
    tripId: idea.workingTripId
  });
  const [copyPassport, copyHat] = copy;
  if (!copyPassport || !copyHat) throw new Error('Expected copied items');
  expect(copyPassport.id).not.toBe(passport.id);
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: idea.proposalId })
  ).resolves.toMatchObject({ changes: [] });
  await owner.client.mutation(api.routes.trips.packing.update.run, {
    itemId: copyPassport.id,
    label: 'Travel documents',
    packed: true,
    tripId: idea.workingTripId
  });
  await owner.client.mutation(api.routes.trips.packing.remove.run, {
    itemId: copyHat.id,
    tripId: idea.workingTripId
  });
  const proposal = await owner.client.query(api.routes.trips.versions.get.run, {
    proposalId: idea.proposalId
  });
  expect(proposal.changes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        entity: 'packing',
        change: 'modified',
        key: `packing/${passport.id}.json`,
        fields: expect.arrayContaining([
          expect.objectContaining({ key: 'packed', before: false, after: true })
        ])
      }),
      expect.objectContaining({
        entity: 'packing',
        change: 'removed',
        key: `packing/${hat.id}.json`
      })
    ])
  );
  await expect(owner.client.query(api.routes.trips.packing.list.run, { tripId })).resolves.toEqual(
    items
  );
  expect(await approveAndApply(owner, reviewer, idea.proposalId)).toBe('applied');
  await expect(owner.client.query(api.routes.trips.packing.list.run, { tripId })).resolves.toEqual([
    { id: passport.id, label: 'Travel documents', packed: true }
  ]);
});

test('editing packing invalidates earlier approvals', { timeout: 15_000 }, async () => {
  const { owner, reviewer, tripId } = await setupPackingPlan();
  const idea = await openTripDraft(owner, tripId);
  const [item] = await owner.client.query(api.routes.trips.packing.list.run, {
    tripId: idea.workingTripId
  });
  if (!item) throw new Error('Expected packing item');
  await owner.client.mutation(api.routes.trips.packing.update.run, {
    itemId: item.id,
    label: 'Travel documents',
    tripId: idea.workingTripId
  });
  await owner.client.action(api.routes.trips.versions.submit.run, { proposalId: idea.proposalId });
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: idea.proposalId
  });
  await owner.client.mutation(api.routes.trips.packing.update.run, {
    itemId: item.id,
    packed: true,
    tripId: idea.workingTripId
  });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: idea.proposalId })
  ).resolves.toMatchObject({
    approvalCount: 0,
    canMerge: false
  });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: idea.proposalId })
  ).rejects.toThrow('needs 1 approval');
});

test('rebases independent packing changes without losing item identity', {
  timeout: 15_000
}, async () => {
  const { owner, reviewer, tripId, passport, hat } = await setupPackingPlan();
  const mine = await openTripDraft(owner, tripId);
  const theirs = await openTripDraft(reviewer, tripId);
  const mineItems = await owner.client.query(api.routes.trips.packing.list.run, {
    tripId: mine.workingTripId
  });
  const theirItems = await reviewer.client.query(api.routes.trips.packing.list.run, {
    tripId: theirs.workingTripId
  });
  const minePassport = mineItems.find((item) => item.label === 'Passport');
  const theirHat = theirItems.find((item) => item.label === 'Hat');
  if (!minePassport || !theirHat) throw new Error('Expected cloned items');
  await owner.client.mutation(api.routes.trips.packing.update.run, {
    itemId: minePassport.id,
    packed: true,
    tripId: mine.workingTripId
  });
  await reviewer.client.mutation(api.routes.trips.packing.update.run, {
    itemId: theirHat.id,
    label: 'Sun hat',
    tripId: theirs.workingTripId
  });
  expect(await approveAndApply(reviewer, owner, theirs.proposalId, owner)).toBe('applied');
  await owner.client.action(api.routes.trips.versions.submit.run, { proposalId: mine.proposalId });
  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: mine.proposalId,
      resolutions: []
    })
  ).resolves.toEqual({ kind: 'applied' });
  const proposal = await owner.client.query(api.routes.trips.versions.get.run, {
    proposalId: mine.proposalId
  });
  expect(proposal.changes).toMatchObject([
    {
      key: `packing/${passport.id}.json`,
      change: 'modified',
      fields: [{ key: 'packed', before: false, after: true }]
    }
  ]);
  await reviewer.client.mutation(api.routes.trips.versions.approval.run, {
    approved: true,
    proposalId: mine.proposalId
  });
  await expect(
    owner.client.action(api.routes.trips.versions.merge.run, { proposalId: mine.proposalId })
  ).resolves.toBe('applied');
  await expect(owner.client.query(api.routes.trips.packing.list.run, { tripId })).resolves.toEqual([
    { id: passport.id, label: 'Passport', packed: true },
    { id: hat.id, label: 'Sun hat', packed: false }
  ]);
});

test('surfaces packing conflicts and resolves them through the standard idea choices', {
  timeout: 15_000
}, async () => {
  const { owner, reviewer, tripId, passport } = await setupPackingPlan();
  const mine = await openTripDraft(owner, tripId);
  const theirs = await openTripDraft(reviewer, tripId);
  for (const [actor, idea, label] of [
    [owner, mine, 'My documents'],
    [reviewer, theirs, 'Our documents']
  ] as const) {
    const [item] = await actor.client.query(api.routes.trips.packing.list.run, {
      tripId: idea.workingTripId
    });
    if (!item) throw new Error('Expected packing item');
    await actor.client.mutation(api.routes.trips.packing.update.run, {
      itemId: item.id,
      label,
      tripId: idea.workingTripId
    });
  }
  expect(await approveAndApply(reviewer, owner, theirs.proposalId, owner)).toBe('applied');
  expect(await approveAndApply(owner, reviewer, mine.proposalId)).toBe('conflicted');
  const path = `packing/${passport.id}.json`;
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: mine.proposalId })
  ).resolves.toMatchObject({
    conflicts: [{ entity: 'packing', key: path, label: 'My documents' }]
  });
  await expect(
    owner.client.action(api.routes.trips.versions.rebase.run, {
      proposalId: mine.proposalId,
      resolutions: [{ path, choice: 'current' }]
    })
  ).resolves.toEqual({ kind: 'applied' });
  const [resolved] = await owner.client.query(api.routes.trips.packing.list.run, {
    tripId: mine.workingTripId
  });
  expect(resolved).toMatchObject({ label: 'Our documents' });
  await expect(
    owner.client.query(api.routes.trips.versions.get.run, { proposalId: mine.proposalId })
  ).resolves.toMatchObject({ changes: [], conflicts: [] });
});
