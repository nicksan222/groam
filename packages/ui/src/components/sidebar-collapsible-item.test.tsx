import { SidebarProvider } from '@groam/ui/components/sidebar';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { SidebarCollapsibleItem } from './sidebar-collapsible-item';

function stubMatchMedia(matches = false) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn()
      }) as unknown as MediaQueryList
  );
}

function Harness({
  child = 'Child item',
  open,
  onOpenChange
}: {
  child?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <SidebarProvider>
      <ul>
        <SidebarCollapsibleItem
          label="trips"
          onOpenChange={onOpenChange}
          open={open}
          trigger={<a href="#trips">Trips</a>}
        >
          <li>{child}</li>
        </SidebarCollapsibleItem>
      </ul>
    </SidebarProvider>
  );
}

beforeEach(() => {
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('hides children while collapsed', () => {
  render(<Harness onOpenChange={vi.fn()} open={false} />);
  expect(screen.queryByText('Child item')).toBeNull();
  expect(screen.getByRole('button', { name: 'Expand trips' }).getAttribute('aria-expanded')).toBe(
    'false'
  );
});

test('the hover action toggles children without following the parent link', () => {
  const onOpenChange = vi.fn();
  const { rerender } = render(<Harness onOpenChange={onOpenChange} open={true} />);

  expect(screen.getByText('Child item')).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: 'Trips' }));
  expect(onOpenChange).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse trips' }));
  expect(onOpenChange).toHaveBeenCalledWith(false);

  rerender(<Harness onOpenChange={onOpenChange} open={false} />);
  expect(screen.queryByText('Child item')).toBeNull();
  expect(screen.getByRole('button', { name: 'Expand trips' }).getAttribute('aria-expanded')).toBe(
    'false'
  );
});
