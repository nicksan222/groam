import { expect as playwrightExpect } from '@playwright/test';
import { type UiTarget, ui } from './interaction';
import { openGroamAssistant } from './open-groam-assistant';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type ShowGroamAssistantCapabilitiesInput = {
  attachment: string;
  suggestion: string;
};

export async function showGroamAssistantCapabilities(
  target: UiTarget,
  input: ShowGroamAssistantCapabilitiesInput
): Promise<void> {
  const user = ui(target);
  const panel = user.page.getByRole('region', { name: 'Groam AI', exact: true });
  if (!(await panel.isVisible())) await openGroamAssistant(user);
  const suggestion = panel.getByRole('button', { name: input.suggestion, exact: true });
  await expect(suggestion).toBeVisible();
  await user.point(suggestion);
  await user.click(panel.getByRole('button', { name: 'Attach trip context', exact: true }));
  const menu = user.page.getByRole('menu');
  await expect(menu.getByText('Attach to this AI chat', { exact: true })).toBeVisible();
  const attachment = menu
    .getByRole('menuitemcheckbox', {
      name: `${input.attachment} Trip`,
      exact: true
    })
    .last();
  await expect(attachment).toBeVisible();
  await user.point(attachment);
}
