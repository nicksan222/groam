import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { Button } from './button';

test('renders a native button with default variant styles', async () => {
  await render(<Button>Save</Button>);

  const button = page.getByRole('button', { name: 'Save' }).element();
  expect(button.getAttribute('data-slot')).toBe('button');
  expect(button.className).toContain('bg-primary');
  expect(button.className).toContain('h-8');
});

test.each([
  ['destructive', 'bg-destructive'],
  ['outline', 'border'],
  ['secondary', 'bg-secondary'],
  ['ghost', 'hover:bg-muted'],
  ['link', 'underline-offset-4']
] as const)('applies the %s variant', async (variant, expectedClass) => {
  await render(<Button variant={variant}>Action</Button>);
  await expect.element(page.getByRole('button', { name: 'Action' })).toHaveClass(expectedClass);
});

test.each([
  ['sm', 'h-7'],
  ['lg', 'h-9'],
  ['icon', 'size-8']
] as const)('applies the %s size', async (size, expectedClass) => {
  await render(
    <Button aria-label="Icon action" size={size}>
      +
    </Button>
  );
  await expect
    .element(page.getByRole('button', { name: 'Icon action' }))
    .toHaveClass(expectedClass);
});

test('forwards button props and handles clicks', async () => {
  const onClick = vi.fn();
  await render(
    <Button disabled onClick={onClick} type="submit">
      Submit
    </Button>
  );

  const button = page.getByRole('button', { name: 'Submit' }).element();
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(button.getAttribute('type')).toBe('submit');

  // A real click waits for an enabled target; force it to prove disabled buttons ignore clicks.
  await userEvent.click(button, { force: true });
  expect(onClick).not.toHaveBeenCalled();
});

test('merges custom class names onto variant output', async () => {
  await render(<Button className="w-full">Full width</Button>);
  await expect.element(page.getByRole('button', { name: 'Full width' })).toHaveClass('w-full');
});

test('supports bespoke interaction surfaces without injecting control dimensions', async () => {
  await render(
    <Button className="grid w-full" unstyled>
      Open card
    </Button>
  );

  const button = page.getByRole('button', { name: 'Open card' }).element();
  expect(button.className).toBe('grid w-full');
  expect(button.getAttribute('data-slot')).toBe('button');
});

test('renders asChild by merging props onto the child element', async () => {
  await render(
    <Button asChild variant="outline">
      <a href="/settings">Settings</a>
    </Button>
  );

  const link = page.getByRole('link', { name: 'Settings' }).element();
  expect(link.getAttribute('data-slot')).toBe('button');
  expect(link.className).toContain('border');
  expect(link.getAttribute('href')).toBe('/settings');
});

test('defaults to a non-submitting button inside forms', async () => {
  const onSubmit = vi.fn((event: Event) => event.preventDefault());
  await render(
    <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
      <Button>Close</Button>
    </form>
  );
  const button = page.getByRole('button', { name: 'Close' });
  expect(button.element().getAttribute('type')).toBe('button');
  await button.click();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('a pending button is disabled, busy, keeps its name and width, and announces a status', async () => {
  const onClick = vi.fn();
  const { rerender } = await render(
    <Button onClick={onClick} pending={false}>
      Save changes
    </Button>
  );
  const button = page.getByRole('button', { name: 'Save changes' });
  const restWidth = button.element().getBoundingClientRect().width;
  expect(button.element().hasAttribute('aria-busy')).toBe(false);
  const status = document.querySelector('[data-slot="button-status"]');
  expect(status?.textContent).toBe('');

  await rerender(
    <Button onClick={onClick} pending>
      Save changes
    </Button>
  );
  expect(button.element().getBoundingClientRect().width).toBe(restWidth);
  expect(button.element().getAttribute('aria-busy')).toBe('true');
  expect((button.element() as HTMLButtonElement).disabled).toBe(true);
  expect(status?.textContent).toBe('Working…');
  // The spinner is decorative: the live region beside the button is the only announcement.
  expect(button.element().querySelector('[role="status"]')).toBeNull();
  expect(button.element().contains(status)).toBe(false);
  await userEvent.click(button.element(), { force: true });
  expect(onClick).not.toHaveBeenCalled();
});

test('a button without a pending prop renders no status region or wrapper', async () => {
  await render(<Button>Plain</Button>);
  expect(document.querySelector('[data-slot="button-status"]')).toBeNull();
  expect(document.querySelector('[data-slot="button-content"]')).toBeNull();
});
