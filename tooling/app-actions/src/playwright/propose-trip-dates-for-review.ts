import type { UiTarget } from './interaction';
import { setTripDates } from './set-trip-dates';
import { startItineraryIdea } from './start-itinerary-idea';
import { submitIdeaForReview } from './submit-idea-for-review';

export type ProposeTripDatesForReviewInput = {
  end: string;
  name: string;
  reviewer: UiTarget;
  start: string;
};

export async function proposeTripDatesForReview(
  target: UiTarget,
  input: ProposeTripDatesForReviewInput
): Promise<void> {
  await startItineraryIdea(target, input.name);
  await setTripDates(target, input.start, input.end);
  await submitIdeaForReview(target, input.reviewer);
}
