import * as z from 'zod/v3';

export const ideaReviewSchema = z.object({
  comments: z
    .array(
      z.object({
        body: z.string().min(1).max(2_000),
        kind: z
          .enum(['comment', 'change_request'])
          .describe(
            'change_request only for a blocking problem that must be fixed before applying; comment for non-blocking suggestions or questions.'
          )
      })
    )
    .max(6)
    .describe('Individual review comments. Empty when the idea needs no remarks.'),
  summary: z.string().min(1).max(2_000).describe('The review body shown to the team.'),
  verdict: z
    .enum(['approve', 'request_changes', 'comment'])
    .describe(
      'approve when there are no blocking concerns; request_changes when something blocks applying; comment for feedback without a decision.'
    )
});

export const ideaReviewSystemPrompt =
  'Review this proposed trip like a careful human travel-planning reviewer. Check dates, ordering, feasibility, missing connections, budget consistency, and obvious traveler risks. Do not apply, resolve, or edit anything. Return a verdict: approve only when there are no blocking concerns, request_changes when something blocks applying, or comment when you only have remarks. Use change_request comments only for blocking problems and comment for non-blocking suggestions or questions. The summary is the review body. An approving review should not contain change_request comments.';
