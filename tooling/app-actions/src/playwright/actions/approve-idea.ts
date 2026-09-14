import { expect as playwrightExpect } from '@playwright/test';
import type { ApproveIdeaAction, ApproveIdeaInput } from '#src/actions/approve-idea';
import { ids } from '#src/playwright/ids';
import { type UiTarget, ui } from '#src/playwright/interaction';
import { by } from '#src/playwright/locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export const approveIdeaAction: ApproveIdeaAction<UiTarget> = async (target, input) => {
  const user = ui(target);
  const approval = by(user.page, ids.approveIdea).first();
  const approved = (await approval.textContent())?.includes('Remove approval') ?? false;
  if (approved === (input.approved ?? true)) return;
  await user.click(approval);
  await expect(approval).toHaveText((input.approved ?? true) ? /Remove approval/u : /Approve/u);
};

export function approveIdea(target: UiTarget): Promise<void> {
  return approveIdeaAction(target, {} satisfies ApproveIdeaInput);
}
