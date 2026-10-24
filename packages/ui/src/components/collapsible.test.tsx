import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';

const example = (keepMounted: boolean) => (
  <Collapsible>
    <CollapsibleTrigger>More</CollapsibleTrigger>
    <CollapsibleContent keepMounted={keepMounted}>Details</CollapsibleContent>
  </Collapsible>
);

test('collapsed content is unmounted until the trigger opens it', async () => {
  await render(example(false));

  expect(document.body.textContent).not.toContain('Details');
  await page.getByText('More').click();
  await expect.element(page.getByText('Details')).toBeVisible();
});

test('keepMounted content stays in the DOM, hidden, while collapsed', async () => {
  await render(example(true));

  expect(document.body.textContent).toContain('Details');
  await expect.element(page.getByText('Details')).not.toBeVisible();
  await page.getByText('More').click();
  await expect.element(page.getByText('Details')).toBeVisible();
});

test('the trigger shows a chevron that turns with the state', async () => {
  const { container } = await render(example(false));

  const trigger = page.getByRole('button', { name: 'More' });
  const chevron = container.querySelector('[data-slot="collapsible-trigger"] svg');
  expect(chevron).not.toBeNull();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(trigger.element().getAttribute('data-state')).toBe('open');
});

test('asChild brings its own control and adds no chevron', async () => {
  const { container } = await render(
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button type="button">Own</button>
      </CollapsibleTrigger>
      <CollapsibleContent>Body</CollapsibleContent>
    </Collapsible>
  );

  expect(container.querySelector('svg')).toBeNull();
});
