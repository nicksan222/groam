import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { FormActions } from './form-actions';

test('full-width stacked actions preserve button height on phones', async () => {
  await useViewport(390, 844);
  await render(<FormActions fullWidth submitLabel="Create account" />);
  const button = page.getByRole('button', { name: 'Create account' }).element();
  expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(32);
  expect(button.getBoundingClientRect().width).toBe(
    button.parentElement!.getBoundingClientRect().width
  );
});

test('renders Cancel and a submit button', async () => {
  const onCancel = vi.fn();
  await render(<FormActions onCancel={onCancel} submitLabel="Save" />);
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(onCancel).toHaveBeenCalledOnce();
  expect(page.getByRole('button', { name: 'Save' }).element().getAttribute('type')).toBe('submit');
});

test('omits Cancel without onCancel and shows the hint', async () => {
  await render(<FormActions hint="Comments don’t block approval." submitLabel="Save" />);
  await expect.element(page.getByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  await expect.element(page.getByText('Comments don’t block approval.')).toBeInTheDocument();
});

test('pending disables both buttons and marks submit busy', async () => {
  await render(<FormActions isPending onCancel={() => {}} submitLabel="Post" />);
  await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  const submit = page.getByRole('button', { name: 'Post' });
  await expect.element(submit).toBeDisabled();
  await expect.element(submit).toHaveAttribute('aria-busy', 'true');
});

test('places extra buttons before submit', async () => {
  await render(
    <FormActions submitLabel="Request changes">
      <button type="button">Comment</button>
    </FormActions>
  );
  const labels = [...document.querySelectorAll('button')].map((button) => button.textContent);
  expect(labels).toEqual(['Comment', 'Request changes']);
});

test('compact rows stay a right-aligned pair; leading controls sit opposite', async () => {
  await render(
    <FormActions leading={<button type="button">Remove</button>} size="sm" submitLabel="Save" />
  );
  const row = document.querySelector('[data-slot=form-actions]');
  expect(row?.className).toContain('flex-wrap');
  expect(row?.className).toContain('justify-between');
  expect(row?.className).not.toContain('flex-col');
});
