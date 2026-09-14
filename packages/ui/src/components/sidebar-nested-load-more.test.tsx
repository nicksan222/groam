import { SidebarProvider } from '@groam/ui/components/sidebar';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { SidebarNestedLoadMore } from './sidebar-nested-load-more';

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

beforeEach(() => {
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('invokes onLoadMore from the idle control', () => {
  const onLoadMore = vi.fn();
  render(
    <SidebarProvider>
      <ul>
        <SidebarNestedLoadMore onLoadMore={onLoadMore} />
      </ul>
    </SidebarProvider>
  );

  fireEvent.click(screen.getByText('Load more'));
  expect(onLoadMore).toHaveBeenCalledTimes(1);
});

test('disables the control while more items are loading', () => {
  const onLoadMore = vi.fn();
  render(
    <SidebarProvider>
      <ul>
        <SidebarNestedLoadMore isLoadingMore onLoadMore={onLoadMore} />
      </ul>
    </SidebarProvider>
  );

  fireEvent.click(screen.getByText('Loading…'));
  expect(onLoadMore).not.toHaveBeenCalled();
});
