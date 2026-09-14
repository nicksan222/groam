import * as z from 'zod/v3';

export const ideaReviewSchema = z.object({
  comments: z
    .array(z.string().min(1).max(2_000))
    .max(5)
    .describe(
      'Only actionable concerns that should block applying the proposal. Empty when sound.'
    ),
  summary: z.string().min(1).max(1_000)
});

export const ideaReviewSystemPrompt =
  'Review this proposed trip as a careful travel-planning reviewer. Check dates, ordering, feasibility, missing connections, budget consistency, and obvious traveler risks. Do not approve, apply, resolve, or edit anything. Return only actionable blocking comments; it is valid to return no comments.';
