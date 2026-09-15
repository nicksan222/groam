import { expect as playwrightExpect } from '@playwright/test';
import type { ArchiveTripAction, ArchiveTripInput } from '#src/actions/archive-trip';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const archiveTripAction: ArchiveTripAction<UiTarget> = async (target) => {
  const user = ui(target);
  await user.click(by(user.page, ids.tripArchive));
  await user.click(user.page.getByRole('alertdialog').getByRole('button', { name: 'Continue' }));
  await user.click(by(user.page, ids.tripActions));
  await expect(by(user.page, ids.tripActionRestore)).toBeVisible();
};

export function archiveTrip(target: UiTarget): Promise<void> {
  return archiveTripAction(target, {} satisfies ArchiveTripInput);
}
