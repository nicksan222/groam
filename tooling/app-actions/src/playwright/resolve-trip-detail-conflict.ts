import { expect as playwrightExpect } from '@playwright/test';
import { ids } from './ids';
import { type UiTarget, ui } from './interaction';
import { by } from './locators';

const expect = playwrightExpect.configure({ timeout: 30_000 });

export type TripDetailConflictChoice = {
  field: string;
  source: 'idea' | 'shared';
};

export type ResolveTripDetailConflictInput = {
  choices?: readonly TripDetailConflictChoice[];
  expectedBranches?: readonly { field: string; idea: string; shared: string }[];
  expectedPreview?: readonly string[];
  expectedSides?: readonly string[];
};

function sourceLabel(source: TripDetailConflictChoice['source']): string {
  return source === 'shared' ? 'shared trip' : 'this idea';
}

export async function resolveTripDetailConflict(
  target: UiTarget,
  input: ResolveTripDetailConflictInput
): Promise<void> {
  const user = ui(target);
  await user.click(by(user.page, ids.itineraryDetailsResolve));
  const dialog = user.page.getByRole('dialog', {
    name: 'Choose what to keep — trip details'
  });
  for (const side of input.expectedSides ?? []) {
    await expect(dialog.getByLabel('Compared sides')).toContainText(side);
  }
  for (const branch of input.expectedBranches ?? []) {
    await expect(
      dialog.getByRole('region', { name: `Shared trip branch for ${branch.field}` })
    ).toContainText(branch.shared);
    await expect(
      dialog.getByRole('region', { name: `This idea branch for ${branch.field}` })
    ).toContainText(branch.idea);
  }
  await user.click(dialog.getByRole('button', { name: 'Keep all mine' }));
  for (const choice of input.choices ?? []) {
    await user.click(
      dialog.getByRole('button', {
        exact: true,
        name: `Keep ${sourceLabel(choice.source)} for ${choice.field}`
      })
    );
  }
  await user.click(dialog.getByRole('button', { name: 'Review result' }));
  const preview = dialog.getByRole('region', { name: 'Result preview' });
  for (const value of input.expectedPreview ?? []) {
    await expect(preview.getByText(value, { exact: true })).toBeVisible();
  }
  await user.click(by(user.page, ids.itineraryDetailsResolveApply));
  await expect(dialog).toBeHidden({ timeout: 30_000 });
}
