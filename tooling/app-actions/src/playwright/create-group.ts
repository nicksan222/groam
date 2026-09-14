import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by, dialogSubmit } from './locators';
import { openSettingsGroupSection } from './navigation';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type CreateGroupInput = {
  name: string;
};

export async function createGroup(target: UiTarget, input: CreateGroupInput): Promise<void> {
  const user = ui(target);
  await openSettingsGroupSection(user.page);
  await user.click(by(user.page, ids.settingsNewGroup));
  await user.type(by(user.page, ids.createGroupName), input.name);
  await user.click(dialogSubmit(user.page, ids.createGroupDialog));
  await expect(by(user.page, ids.groupSwitcher)).toHaveAttribute('data-group-name', input.name);
}
