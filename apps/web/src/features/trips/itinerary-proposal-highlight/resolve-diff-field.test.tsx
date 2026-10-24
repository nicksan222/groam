import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResolutionRow } from '@/features/trips/hooks/detail-resolution-values';
import { ResolveDiffField } from './resolve-diff-field';

function makeRow(overrides: Partial<ResolutionRow> = {}): ResolutionRow {
  return {
    key: 'name',
    label: 'Trip name',
    media: false,
    mine: 'My plan',
    mineMedia: [],
    shared: 'Shared plan',
    sharedMedia: [],
    ...overrides
  };
}

function renderField(props: Partial<Parameters<typeof ResolveDiffField>[0]> = {}) {
  return render(
    <ResolveDiffField
      disabled={false}
      ideaBranchName="Lisbon alternatives"
      onChoose={vi.fn()}
      row={makeRow()}
      sharedBranchName="Summer trip"
      {...props}
    />
  );
}

describe('status label', () => {
  test.each([
    ['unresolved differing values', {}, 'Choose what to keep'],
    ['identical values', { row: makeRow({ mine: 'Same', shared: 'Same' }) }, 'Same on both sides'],
    ['a shared choice', { choice: 'shared' as const }, 'Keeping shared trip'],
    ['a mine choice', { choice: 'mine' as const }, 'Keeping this idea']
  ])('shows the right text for %s', async (_, props, label) => {
    await renderField(props);
    await expect.element(page.getByText(label, { exact: true })).toBeVisible();
  });
});

test('shows both sides with their branch names and values', async () => {
  await renderField();
  await expect.element(page.getByText('Summer trip')).toBeVisible();
  await expect.element(page.getByText('Lisbon alternatives')).toBeVisible();
  await expect.element(page.getByText('My plan')).toBeVisible();
  await expect.element(page.getByText('Shared plan')).toBeVisible();
});

test('reports which side was chosen', async () => {
  const onChoose = vi.fn();
  await renderField({ onChoose });
  await page.getByRole('button', { name: 'Keep my idea for Trip name' }).click();
  await page.getByRole('button', { name: 'Keep shared trip for Trip name' }).click();
  expect(onChoose.mock.calls).toEqual([['mine'], ['shared']]);
});

test('marks the chosen side as pressed and confirms the result', async () => {
  await renderField({ choice: 'mine' });
  await expect
    .element(page.getByRole('button', { name: 'Keep my idea for Trip name' }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect
    .element(page.getByRole('button', { name: 'Keep shared trip for Trip name' }))
    .toHaveAttribute('aria-pressed', 'false');
  await expect.element(page.getByText('Result takes this field from this idea.')).toBeVisible();
});

test('disables both choices when disabled', async () => {
  await renderField({ disabled: true });
  await expect
    .element(page.getByRole('button', { name: 'Keep my idea for Trip name' }))
    .toBeDisabled();
  await expect
    .element(page.getByRole('button', { name: 'Keep shared trip for Trip name' }))
    .toBeDisabled();
});
