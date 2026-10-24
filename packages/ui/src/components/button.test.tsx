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

const busyStatus = () => document.querySelector('[data-slot="busy-announcer"]')?.textContent ?? '';

test('pending clicks do not activate a clickable ancestor', async () => {
  const onParentClick = vi.fn();
  await render(
    <div onClick={onParentClick} role="presentation">
      <Button pending>Busy</Button>
    </div>
  );
  const button = page.getByRole('button', { name: 'Busy' }).element();
  expect(getComputedStyle(button).pointerEvents).not.toBe('none');
  await userEvent.click(button, { force: true });
  expect(onParentClick).not.toHaveBeenCalled();
});

test('a pending button is busy and inert, keeps its name, width and focus, and announces once', async () => {
  const onClick = vi.fn();
  const { rerender } = await render(
    <Button onClick={onClick} pending={false}>
      Save changes
    </Button>
  );
  const button = page.getByRole('button', { name: 'Save changes' });
  const restWidth = button.element().getBoundingClientRect().width;
  expect(button.element().hasAttribute('aria-busy')).toBe(false);
  expect(button.element().hasAttribute('aria-disabled')).toBe(false);
  (button.element() as HTMLButtonElement).focus();

  await rerender(
    <Button onClick={onClick} pending>
      Save changes
    </Button>
  );
  expect(button.element().getBoundingClientRect().width).toBe(restWidth);
  expect(button.element().getAttribute('aria-busy')).toBe('true');
  expect(button.element().getAttribute('aria-disabled')).toBe('true');
  // Not natively disabled: a disabled button would drop focus to the body.
  expect((button.element() as HTMLButtonElement).disabled).toBe(false);
  expect(document.activeElement).toBe(button.element());
  // The spinner is decorative and no status region sits beside the button.
  expect(button.element().querySelector('[role="status"]')).toBeNull();
  expect(button.element().nextElementSibling).toBeNull();
  await vi.waitFor(() => expect(busyStatus()).toBe('Working…'));
  await userEvent.click(button.element(), { force: true });
  expect(onClick).not.toHaveBeenCalled();

  await rerender(
    <Button onClick={onClick} pending={false}>
      Save changes
    </Button>
  );
  expect(busyStatus()).toBe('');
  await userEvent.click(button.element());
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('a pending submit button does not submit its form', async () => {
  const onSubmit = vi.fn((event: Event) => event.preventDefault());
  await render(
    <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
      <input aria-label="Name" />
      <Button pending type="submit">
        Save
      </Button>
    </form>
  );
  await userEvent.click(page.getByRole('button', { name: 'Save' }).element(), { force: true });
  await userEvent.type(page.getByLabelText('Name').element(), '{Enter}');
  expect(onSubmit).not.toHaveBeenCalled();
});

test('several pending buttons share one announcement', async () => {
  await render(
    <div>
      <Button pending>One</Button>
      <Button pending>Two</Button>
    </div>
  );
  await vi.waitFor(() => expect(busyStatus()).toBe('Working…'));
  expect(document.querySelectorAll('[data-slot="busy-announcer"]')).toHaveLength(1);
});

test('a pending button adds no sibling elements', async () => {
  await render(
    <div data-testid="row">
      <Button pending>Only</Button>
    </div>
  );
  expect(page.getByTestId('row').element().children).toHaveLength(1);
});

test('the pending wrapper follows the button gap, justification and truncation', async () => {
  await render(
    <Button className="w-64 justify-between gap-6" pending={false}>
      <span className="truncate" data-testid="label">
        A very long label that should truncate rather than overflow the button width at all
      </span>
      <span data-testid="end">End</span>
    </Button>
  );
  const wrapper = document.querySelector('[data-slot="button-content"]') as HTMLElement;
  const style = getComputedStyle(wrapper);
  expect(style.columnGap).toBe(getComputedStyle(wrapper.parentElement as HTMLElement).columnGap);
  expect(style.columnGap).toBe('24px');
  expect(getComputedStyle(wrapper.parentElement as HTMLElement).justifyContent).toBe(
    'space-between'
  );
  expect(style.justifyContent).toBe('space-between');
  const button = wrapper.parentElement as HTMLElement;
  expect(wrapper.getBoundingClientRect().width).toBeLessThanOrEqual(
    button.getBoundingClientRect().width
  );
  const label = page.getByTestId('label').element();
  expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
});

test('an unstyled pending button anchors its spinner and sizes it to the button', async () => {
  const { rerender } = await render(
    <Button className="grid" pending unstyled>
      Card
    </Button>
  );
  const button = page.getByRole('button', { name: 'Card' }).element();
  expect(getComputedStyle(button).position).toBe('relative');
  expect(button.querySelector('svg')?.getAttribute('class')).toContain('size-4');
  await rerender(
    <Button pending size="xs">
      Tiny
    </Button>
  );
  expect(
    page.getByRole('button', { name: 'Tiny' }).element().querySelector('svg')?.getAttribute('class')
  ).toContain('size-3.5');
});

test('a button without a pending prop renders no wrapper and registers no announcement', async () => {
  await render(<Button>Plain</Button>);
  expect(document.querySelector('[data-slot="button-content"]')).toBeNull();
  expect(page.getByRole('button', { name: 'Plain' }).element().hasAttribute('aria-disabled')).toBe(
    false
  );
});
