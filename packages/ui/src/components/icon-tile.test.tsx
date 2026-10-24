import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { IconTile } from './icon-tile';

test('renders a tinted square tile by default', async () => {
  const { container } = await render(<IconTile>i</IconTile>);

  const tile = container.firstElementChild;
  expect(tile?.getAttribute('data-slot')).toBe('icon-tile');
  expect(tile?.className).toContain('size-9');
  expect(tile?.className).toContain('rounded-lg');
  expect(tile?.className).toContain('bg-primary/10');
});

test('size, radius, and variant select their tokens', async () => {
  const { container } = await render(
    <IconTile radius="full" size="xs" variant="destructive">
      i
    </IconTile>
  );

  const tile = container.firstElementChild;
  expect(tile?.className).toContain('size-6');
  expect(tile?.className).toContain('rounded-full');
  expect(tile?.className).toContain('bg-destructive/10');
});

test('the plain variant leaves color and border to className', async () => {
  const { container } = await render(
    <IconTile className="border border-primary/25 text-primary" variant="plain">
      i
    </IconTile>
  );

  const tile = container.firstElementChild;
  expect(tile?.className).toContain('border-primary/25');
  expect(tile?.className).not.toContain('bg-primary/10');
});
