import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { MenuRow } from './menu-row';

afterEach(cleanup);

test('renders a panel-density menu row by default', () => {
  render(<MenuRow>Assign</MenuRow>);
  const row = screen.getByRole('button', { name: 'Assign' });
  expect(row.getAttribute('data-slot')).toBe('menu-row');
  expect(row.getAttribute('data-density')).toBe('panel');
  expect(row.className).toContain('px-3');
  expect(row.className).toContain('hover:bg-muted');
});

test('supports compact popover density', () => {
  render(
    <MenuRow density="popover" type="button">
      Pick
    </MenuRow>
  );
  const row = screen.getByRole('button', { name: 'Pick' });
  expect(row.getAttribute('data-density')).toBe('popover');
  expect(row.className).toContain('rounded-md');
  expect(row.className).toContain('px-2');
});
