import { generateText, Output } from 'ai';
import { v } from 'convex/values';
import * as z from 'zod/v3';
import { internal } from '#convex-generated/api';
import { internalAction } from '#convex-generated/server';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { MAX_AUTO_TITLE_LENGTH } from '#convex/modules/travel/versions/names';

const MAX_TITLE_OUTPUT_TOKENS = 256;

const titleOutput = z.object({
  title: z
    .string()
    .min(1)
    .describe(
      `A short title, at most ${MAX_AUTO_TITLE_LENGTH} characters, naming what this trip idea changes. Plain language, no markdown.`
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
          await AssistantProvider.configured(ctx, {
            organizationId,
            userId: credentialOwnerUserId
          })
        ).languageModel,
        output: Output.object({ schema: titleOutput }),
        prompt: JSON.stringify(prompt),
        system: `Name this trip planning idea from its changes. The title should help someone scanning a sidebar understand what changed at a glance. Lead with the most specific detail in the diff: a place added ("Add Kyoto stop"), a stay ("Book Lisbon hostel"), dates ("Move trip to June"), an activity, or a budget change. When the idea makes several changes, name the main one or their shared theme. If the current title still fits the changes, return it unchanged. Use sentence case, at most ${MAX_AUTO_TITLE_LENGTH} characters, no quotes, no trailing punctuation.`
      });

      const title = result.output.title.trim();
      if (!title) throw new Error('The model returned an empty title');
      await ctx.runMutation(internal.modules.travel.versions.agent.title.index.finish, {
        generation,
        proposalId,
        title
      });
      return { title };
    } catch (error: unknown) {
      console.error('idea title generation failed:', error);
      return null;
    }
  }
});
