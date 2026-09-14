import { expect as playwrightExpect } from '@playwright/test';
import type { ApplyIdeaAction, ApplyIdeaInput, ApplyIdeaResult } from '#src/actions/apply-idea';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const applyIdeaAction: ApplyIdeaAction<UiTarget> = async (target) => {
  const user = ui(target);
  await expect(by(user.page, ids.applyIdea).first()).toBeEnabled();
  await user.click(by(user.page, ids.applyIdea).first());
  await expect(
    user.page.getByRole('heading', { name: 'Apply this idea to the shared trip?' })
  ).toBeVisible();
  await user.click(by(user.page, ids.applyIdeaConfirm));
  await expect(by(user.page, ids.applyIdeaConfirm)).toHaveCount(0);
  await expect(
    user.page.getByText('Applied to the shared trip', { exact: true }).first()
  ).toBeVisible();
  return 'applied';
};

export function applyIdea(target: UiTarget): Promise<ApplyIdeaResult> {
  return applyIdeaAction(target, {} satisfies ApplyIdeaInput);
}
