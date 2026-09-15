import { type Page, expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { chatMessage } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function reactToChatMessage(
  target: UiTarget,
  message: string,
  reaction: string,
  observerPages: readonly Page[] = []
): Promise<void> {
  const user = ui(target);
  const row = chatMessage(user.page, message);
  await row.hover();
  await user.click(row.getByTestId(ids.chatMessageReact));
  await user.click(user.page.getByRole('button', { name: reaction, exact: true }));
  for (const page of [user.page, ...observerPages]) {
    await expect(
      chatMessage(page, message).getByRole('button', { name: reaction, exact: true })
    ).toBeVisible();
  }
}
