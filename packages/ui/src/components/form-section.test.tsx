import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { FormSection } from './form-section';

test('names the group by its legend and shows the hint and error', async () => {
  await render(
    <FormSection error="Options must be different." hint="2 selected" legend="Options">
      <input aria-label="Option 1" />
    </FormSection>
  );
  await expect.element(page.getByRole('group', { name: 'Options' })).toBeInTheDocument();
  await expect.element(page.getByText('2 selected')).toBeInTheDocument();
  expect(page.getByRole('alert').element().textContent).toBe('Options must be different.');
});

test('separated draws a rule above the group', async () => {
  await render(
    <FormSection legend="Done when" separated>
      <input aria-label="Rule" />
    </FormSection>
  );
  await expect.element(page.getByRole('group', { name: 'Done when' })).toHaveClass('border-t');
});

test('optional groups use the field mark; nested groups read quieter', async () => {
  await render(
    <FormSection legend="Helpful details">
      <FormSection legend="Files" optional>
        <input aria-label="File" />
      </FormSection>
    </FormSection>
  );
  await expect.element(page.getByText('Optional')).toBeInTheDocument();
  const titles = [...document.querySelectorAll('[data-slot=form-section] span[aria-hidden]')];
  const nestedTitle = titles.find((title) => title.textContent === 'Files');
  expect(nestedTitle?.className).toContain('text-xs');
});
