import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type EditActivityInput = {
  address?: string;
  title: string;
};

export async function editActivity(target: UiTarget, input: EditActivityInput): Promise<void> {
  const user = ui(target);
  await user.click(user.page.getByRole('button', { name: `Edit ${input.title}`, exact: true }));
  const editor = user.page.getByRole('dialog');
  await expect(editor.getByTestId(ids.activityTitle)).toHaveValue(input.title);
  if (input.address !== undefined) {
    await user.type(editor.getByTestId(ids.activityAddress), input.address);
  }
  await user.click(editor.getByTestId(ids.activitySubmit));
  await expect(editor).toBeHidden();
}
