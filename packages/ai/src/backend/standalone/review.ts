import { ideaReviewSystemPrompt } from '#ai/backend/review/schema';
import type { AssistantScreen } from '#ai/runtime/screen';

export type ReviewStandaloneContext = {
  changes: unknown[];
  id: string;
  sourceTripId: string;
  title: string;
  workingTripId: string;
};

export function reviewStandalonePrompt(
  review: Pick<ReviewStandaloneContext, 'changes' | 'sourceTripId' | 'title' | 'workingTripId'>
) {
  // Review criteria stay in ideaReviewSystemPrompt and tool usage in tool
  // guidance; only the run context goes here.
  return [
    `Review the submitted idea "${review.title}".`,
    `The proposed itinerary is the active trip (${review.workingTripId}). The shared trip is ${review.sourceTripId}.`,
    ideaReviewSystemPrompt,
    'Proposed changes:',
    JSON.stringify(review.changes)
  ].join('\n');
}

export function reviewStandaloneScreen(
  review: ReviewStandaloneContext
): AssistantScreen & { target: { kind: 'trip'; section: 'ideas'; tripId: string } } {
  return {
    capabilities: [],
    data: JSON.stringify({
      proposalId: review.id,
      sourceTripId: review.sourceTripId,
      title: review.title,
      workingTripId: review.workingTripId
    }),
    description: 'Standalone Idea reviewer inspecting a submitted trip idea.',
    key: `idea:${review.id}:review`,
    target: { kind: 'trip', section: 'ideas', tripId: review.workingTripId },
    title: `${review.title} · review`
  };
}
