import { requestIdeaReview } from './actions/request-idea-review';
import type { UiTarget } from './interaction';
import { waitForReview } from './wait-for-review';

export async function submitIdeaForReview(author: UiTarget, reviewer: UiTarget): Promise<void> {
  await requestIdeaReview(author);
  await waitForReview(reviewer, author);
}
