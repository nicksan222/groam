import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { chatMessage } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function sendChatMessage(
  target: UiTarget,
  message: string,
  observerPages: readonly Page[] = []
): Promise<void> {
  const user = ui(target);
  const composer = user.page.getByTestId(`${ids.chatComposer}-input`);
  await user.type(composer, message);
  await user.press(composer, 'Enter');
  for (const page of [user.page, ...observerPages]) {
    const row = chatMessage(page, message);
    await expect(row).toBeVisible();
    await row.scrollIntoViewIfNeeded();
  }
}
