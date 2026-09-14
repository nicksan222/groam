import { SidebarProvider } from '@groam/ui/components/sidebar';
import { SidebarCollapsibleItem } from '@groam/ui/components/sidebar-collapsible-item';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useSidebarSectionOpen } from '@/features/workspace/hooks/use-sidebar-section-open';
import { resetSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { stubMatchMedia } from '@/testing/stub-match-media';

function Harness({
  child = 'Child item',
  sectionActive
}: {
  child?: string;
  sectionActive: boolean;
}) {
  const [open, setOpen] = useSidebarSectionOpen('trips');
  return (
    <SidebarProvider>
      <ul>
        <SidebarCollapsibleItem
          label="trips"
          data-active={sectionActive}
          onOpenChange={setOpen}
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
  resetSidebarChromeStore();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('stays collapsed when the section is not active', () => {
  render(<Harness sectionActive={false} />);
  expect(screen.queryByText('Child item')).toBeNull();
  expect(screen.getByRole('button', { name: 'Expand trips' }).getAttribute('aria-expanded')).toBe(
    'false'
  );
});

test('the hover action toggles children without following the parent link', () => {
  render(<Harness sectionActive={true} />);

  fireEvent.click(screen.getByRole('link', { name: 'Trips' }));
  expect(screen.queryByText('Child item')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Expand trips' }));
  expect(screen.getByText('Child item')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse trips' }));
  expect(screen.queryByText('Child item')).toBeNull();
  expect(screen.getByRole('button', { name: 'Expand trips' }).getAttribute('aria-expanded')).toBe(
    'false'
  );

  fireEvent.click(screen.getByRole('button', { name: 'Expand trips' }));
  expect(screen.getByText('Child item')).toBeTruthy();
});

test('keeps the sidebar quiet when navigating into a section', () => {
  const { rerender } = render(<Harness sectionActive={false} />);
  expect(screen.queryByText('Child item')).toBeNull();

  rerender(<Harness sectionActive={true} />);
  expect(screen.queryByText('Child item')).toBeNull();
  expect(screen.getByRole('button', { name: 'Expand trips' })).toBeTruthy();
});
