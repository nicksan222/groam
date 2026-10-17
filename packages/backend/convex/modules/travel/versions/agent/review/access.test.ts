import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupWritableTrip } from '#testing/trips';

test(
  'refuses an idea review for a proposal owned by another group',
  { timeout: 15_000 },
  async () => {
    const { owner, proposalId } = await setupWritableTrip(0);
    const outsider = await createOutsiderClient(owner.test);

    await expect(
      outsider.client.action(api.routes.trips.versions.reviewers.agent.run.run, { proposalId })
    ).rejects.toThrow('Idea trip not found');

    await owner.test.run(async (ctx) => {
      expect(await ctx.db.query('agentRuns').collect()).toHaveLength(0);
    });
  }
);
