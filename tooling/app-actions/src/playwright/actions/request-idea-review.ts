import { expect as playwrightExpect } from '@playwright/test';
import type {
  RequestIdeaReviewAction,
  RequestIdeaReviewInput
} from '#src/actions/request-idea-review';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';
import { openTripSection } from '#src/playwright/open-trip-section';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const requestIdeaReviewAction: RequestIdeaReviewAction<UiTarget> = async (target) => {
  const user = ui(target);
  const compareTab = by(user.page, ids.ideaSectionCompare);
  if (await compareTab.isVisible()) await user.click(compareTab);
  else await openTripSection(user, 'ideas');
  await expect(by(user.page, ids.requestReview).first()).toBeEnabled();
  await user.click(by(user.page, ids.requestReview).first());
  await expect(by(user.page, ids.requestReview)).toHaveCount(0);
};

export function requestIdeaReview(target: UiTarget): Promise<void> {
  return requestIdeaReviewAction(target, {} satisfies RequestIdeaReviewInput);
}
