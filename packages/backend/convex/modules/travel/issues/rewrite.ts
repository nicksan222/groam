import { assistantAgents } from '@groam/ai-contracts/agents/registry';
import { v } from 'convex/values';
import { internalMutation } from '#convex-generated/server';

/** Rewrite pre-split Issue-agent assignees so schema can require `issue`. */
export const groamAssignees = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const issues = await ctx.db.query('tripIssues').order('desc').take(500);
    const toRewrite = issues.filter(
      (issue) =>
        issue.assignee?.kind === 'agent' && issue.assignee.agentId !== assistantAgents.issue.id
    );
    await Promise.all(
      toRewrite.map((issue) =>
        ctx.db.patch('tripIssues', issue._id, {
          assignee: {
            agentId: assistantAgents.issue.id,
            kind: 'agent',
            name: assistantAgents.issue.label
          }
        })
      )
    );
    return toRewrite.length;
  }
});
