import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';
import { openSettingsGroupSection } from './navigation';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type DeleteCurrentGroupInput = {
  fallbackGroupName: string;
};

export async function deleteCurrentGroup(
  target: UiTarget,
  input: DeleteCurrentGroupInput
): Promise<void> {
  const user = ui(target);
  await openSettingsGroupSection(user.page);
  await user.click(by(user.page, ids.deleteGroup));
  await user.click(by(user.page, ids.deleteGroupConfirm));
  await expect(by(user.page, ids.groupSwitcher)).toHaveAttribute(
    'data-group-name',
    input.fallbackGroupName
  );
}
