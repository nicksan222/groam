import { expect as playwrightExpect } from '@playwright/test';
import type { RestoreTripAction, RestoreTripInput } from '#src/actions/restore-trip';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';
import { ids } from '#src/testing/ids';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const restoreTripAction: RestoreTripAction<UiTarget> = async (target) => {
  const user = ui(target);
  const restore = by(user.page, ids.tripActionRestore);
  if (!(await restore.isVisible())) await user.click(by(user.page, ids.tripActions));
  await user.click(restore);
  await expect(by(user.page, ids.tripArchive)).toBeVisible();
};

export function restoreTrip(target: UiTarget): Promise<void> {
  return restoreTripAction(target, {} satisfies RestoreTripInput);
}
