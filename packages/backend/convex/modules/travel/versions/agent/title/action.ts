import { generateText, Output } from 'ai';
import { v } from 'convex/values';
import * as z from 'zod/v3';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { internal } from '#convex-generated/api';
import { internalAction } from '#convex-generated/server';

const MAX_TITLE_OUTPUT_TOKENS = 256;

const titleOutput = z.object({
  title: z
    .string()
    .min(1)
    .max(100)
    .describe(
      'A concise title that summarizes what this trip idea changes. Plain language, no markdown.'
    )
});

export const run = internalAction({
  args: { generation: v.number(), proposalId: v.id('tripProposals') },
  returns: v.union(v.null(), v.object({ title: v.string() })),
  handler: async (ctx, { generation, proposalId }): Promise<{ title: string } | null> => {
    const titleContext: {
      changes: unknown[];
      credentialOwnerUserId: string;
      issueTitle: string | null;
      organizationId: string;
      sourceTripName: string;
      title: string;
    } | null = await ctx.runQuery(internal.modules.travel.versions.agent.title.index.context, {
      generation,
      proposalId
    });
    if (!titleContext) return null;

    try {
      const { credentialOwnerUserId, organizationId, ...prompt } = titleContext;
      const result = await generateText({
        maxOutputTokens: MAX_TITLE_OUTPUT_TOKENS,
        model: (
          await AssistantProvider.configured(ctx, 'groam', {
            organizationId,
            userId: credentialOwnerUserId
          })
        ).languageModel,
        output: Output.object({ schema: titleOutput }),
        prompt: JSON.stringify(prompt),
        system:
          'Name this trip planning idea from its changes. The title should help someone scanning a sidebar understand what changed at a glance. Prefer specific trip details such as destinations, dates, activities, or budget when they appear in the diff. Keep it short, sentence case, and under 80 characters when possible. Do not include quotes or trailing punctuation.'
      });

      await ctx.runMutation(internal.modules.travel.versions.agent.title.index.finish, {
        generation,
        proposalId,
        title: result.output.title
      });
      return { title: result.output.title };
    } catch {
      return null;
    }
  }
});
