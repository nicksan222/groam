import { ideaReviewSystemPrompt } from '#ai-contracts/agents/review/schema';
import type { AssistantScreen } from '#ai-contracts/agents/screen';

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
  return [
    `Review the submitted idea "${review.title}".`,
    `The proposed itinerary is the active trip (${review.workingTripId}). The shared trip is ${review.sourceTripId}.`,
    ideaReviewSystemPrompt,
    'Use getItinerary and getTripStatus on the proposed itinerary before commenting. Pass the shared trip id when you need to compare. Search the web when current facts would change feasibility.',
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
