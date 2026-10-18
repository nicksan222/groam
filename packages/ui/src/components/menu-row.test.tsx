import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { MenuRow } from './menu-row';

test('renders a panel-density menu row by default', async () => {
  await render(<MenuRow>Assign</MenuRow>);
  const row = page.getByRole('button', { name: 'Assign' }).element();
  expect(row.getAttribute('data-slot')).toBe('menu-row');
  expect(row.getAttribute('data-density')).toBe('panel');
  expect(row.className).toContain('px-3');
  expect(row.className).toContain('hover:bg-muted');
});

test('supports compact popover density', async () => {
  await render(
    <MenuRow density="popover" type="button">
      Pick
    </MenuRow>
  );
  const row = page.getByRole('button', { name: 'Pick' }).element();
  expect(row.getAttribute('data-density')).toBe('popover');
  expect(row.className).toContain('rounded-md');
  expect(row.className).toContain('px-2');
});
