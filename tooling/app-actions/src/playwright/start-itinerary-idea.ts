import { addIdea } from './actions/add-idea';
import type { UiTarget } from './interaction';
import { openIdeaItinerary } from './open-idea-itinerary';

export async function startItineraryIdea(target: UiTarget, ideaName: string): Promise<void> {
  await addIdea(target, { name: ideaName });
  await openIdeaItinerary(target);
}
