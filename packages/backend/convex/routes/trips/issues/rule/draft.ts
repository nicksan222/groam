import { ConvexError, v } from 'convex/values';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { checkedRuleRequest, draftRuleFromText } from '#convex/modules/travel/issues/rules/draft';
import { RuleValidators } from '#convex/modules/travel/issues/rules/schema';

/**
 * Drafts a "done when" rule from a sentence with the person's own ChatGPT connection. Nothing is
 * saved: the rule goes back to the builder for the person to review and save.
 */
export const run = workspaceAction({
  args: { text: v.string() },
  returns: v.object({ label: v.string(), rule: RuleValidators.rule }),
  handler: async (ctx, { text }) => {
    const { organizationId, userId } = ctx.workspace;
    // A blank or oversized request is refused before it spends one of the hour's drafts.
    const request = checkedRuleRequest(text);
    const { ok } = await aiRateLimiter.limit(ctx, 'issueRuleDraft', { key: userId });
    if (!ok) throw new ConvexError('Too many rule drafts this hour. Try again later.');
    return await draftRuleFromText(ctx, { organizationId, userId }, request);
  }
});
