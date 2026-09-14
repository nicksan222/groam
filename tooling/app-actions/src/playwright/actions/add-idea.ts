import { expect as playwrightExpect } from '@playwright/test';
import type { AddIdeaAction } from '#src/actions/add-idea';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';
import { openTripSection } from '#src/playwright/open-trip-section';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const addIdea: AddIdeaAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  const ideaName = input.name;
  await openTripSection(user, 'ideas');
  await user.click(by(user.page, ids.sharedTripNewIdea));
  await expect(by(user.page, ids.startIdeaDialog)).toBeVisible();
  await user.type(by(user.page, ids.startIdeaName), ideaName);
  await user.click(user.page.getByTestId(`${ids.startIdeaDialog}-submit`));
  await expect(by(user.page, ids.startIdeaDialog)).toBeHidden({ timeout: 20_000 });
  await expect(user.page).toHaveURL(/\/trips\/[^/]+\/ideas\/[^/]+/u, { timeout: 20_000 });
  await expect(by(user.page, ids.tripHeading)).toBeVisible();
  return user.page.url().match(/\/ideas\/([^/?]+)/u)?.[1] ?? '';
};
