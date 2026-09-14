import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { openCurrentPageOn } from './open-current-page-on';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export async function waitForReview(target: UiTarget, source: UiTarget): Promise<void> {
  await openCurrentPageOn(target, source);
  await expect(ui(target).page.getByTestId(ids.approveIdea).first()).toBeEnabled();
}
