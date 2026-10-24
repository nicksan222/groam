import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { Heading } from './heading';

test('renders the requested outline level with an id passthrough', async () => {
  await render(
    <Heading id="plan-heading" level={3}>
      Plan
    </Heading>
  );

  const heading = page.getByRole('heading', { level: 3, name: 'Plan' }).element();
  expect(heading.tagName).toBe('H3');
  expect(heading.id).toBe('plan-heading');
  expect(heading.getAttribute('data-slot')).toBe('heading');
});

test('level does not change the look; size does', async () => {
  await render(
    <>
      <Heading level={2} size="sm">
        Small
      </Heading>
      <Heading level={4} size="lg">
        Large
      </Heading>
    </>
  );

  expect(page.getByRole('heading', { name: 'Small' }).element().className).toContain('text-sm');
  const large = page.getByRole('heading', { name: 'Large' }).element();
  expect(large.tagName).toBe('H4');
  expect(large.className).toContain('text-lg');
  expect(large.className).toContain('tracking-tight');
});

test('without a size it inherits the font size', async () => {
  await render(<Heading level={3}>Inherited</Heading>);

  const { className } = page.getByRole('heading', { name: 'Inherited' }).element();
  expect(className).toContain('font-semibold');
  expect(className).not.toContain('text-');
});

test('className overrides the size weight', async () => {
  await render(
    <Heading className="font-medium text-muted-foreground" level={2} size="sm">
      Muted
    </Heading>
  );

  const { className } = page.getByRole('heading', { name: 'Muted' }).element();
  expect(className).toContain('font-medium');
  expect(className).not.toContain('font-semibold');
  expect(className).toContain('text-muted-foreground');
});
