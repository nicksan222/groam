import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by, groupSwitcherItem } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type SwitchGroupInput = {
  name: string;
};

export async function switchGroup(target: UiTarget, input: SwitchGroupInput): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.groupSwitcher));
  await user.click(groupSwitcherItem(user.page, input.name));
  await expect(by(user.page, ids.groupSwitcher)).toHaveAttribute('data-group-name', input.name);
}
