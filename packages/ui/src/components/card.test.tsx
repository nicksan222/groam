import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { Card } from './card';

test('the default card stacks its sections with a gap', async () => {
  const { container } = await render(<Card>Body</Card>);

  expect(container.firstElementChild?.className).toContain('flex-col');
  expect(container.firstElementChild?.className).toContain('gap-4');
});

test('the plain variant is the bordered surface without stacking or padding', async () => {
  const { container } = await render(<Card variant="plain">Body</Card>);

  const card = container.firstElementChild;
  expect(card?.className).toContain('rounded-lg');
  expect(card?.className).toContain('bg-card');
  expect(card?.className).not.toContain('flex-col');
  expect(card?.className).not.toContain('pb-4');
});
