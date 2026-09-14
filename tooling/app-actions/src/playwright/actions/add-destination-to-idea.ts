import { expect as playwrightExpect } from '@playwright/test';
import type { AddDestinationToIdeaAction } from '#src/actions/add-destination-to-idea';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by, dialogSubmit } from '#src/playwright/locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const addDestinationToIdea: AddDestinationToIdeaAction<UiTarget> = async (target, place) => {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: 'Add first destination', exact: true }));
  await user.type(by(user.page, ids.destinationSearchInput), place.name);
  await user.click(by(user.page, ids.destinationSearchResult).filter({ hasText: place.label }));
  await user.type(by(user.page, ids.addStopPlans), place.notes);
  await user.click(dialogSubmit(user.page, ids.addStopDialog));
  await expect(by(user.page, ids.addStopDialog)).toBeHidden();
  await expect(
    user.page.getByRole('button', {
      name: `Open ${place.label} details for Day 1`,
      exact: true
    })
  ).toBeVisible();
};
