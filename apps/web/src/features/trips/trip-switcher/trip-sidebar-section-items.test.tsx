import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripSidebarSectionItems } from './trip-sidebar-section-items';

const counts = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock('@/features/trips/hooks/use-trip-section-counts', () => ({
  useTripSectionCounts: () => counts.value
}));
vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params,
    to,
    viewTransition: _viewTransition,
    ...props
  }: {
    children?: ReactNode;
    params: Record<string, string>;
    to: string;
    viewTransition?: boolean;
  }) => (
    <a href={to.replace(/\$(\w+)/g, (_, key: string) => params[key] ?? '')} {...props}>
      {children}
    </a>
  )
}));

const mount = (active: Parameters<typeof TripSidebarSectionItems>[0]['active'] = null) =>
  render(
    <SidebarProvider>
      <ul>
        <TripSidebarSectionItems
          active={active}
          reference="as-written"
          tripId={'trip-1' as never}
        />
      </ul>
    </SidebarProvider>
  );

const sectionLink = (section: string) => {
  const element = document.querySelector<HTMLElement>(`[data-section="${section}"]`);
  if (!element) throw new Error(`No ${section} row`);
  return element;
};
const link = (section: string) => page.elementLocator(sectionLink(section));
const row = (section: string) => sectionLink(section).closest('li');

beforeEach(() => {
  counts.value = {};
});

describe('trip sidebar sections', () => {
  test('lists the twelve sections in order and links with the given reference', async () => {
    await mount();
    expect(
      page
        .getByRole('link')
        .elements()
        .map((element) => element.textContent)
    ).toEqual([
      'Plan',
      'Calendar',
      'Map',
      'Ideas',
      'Issues',
      'Polls',
      'Packing',
      'Research',
      'Activity',
      'People'
    ]);
    await expect.element(link('packing')).toHaveAttribute('href', '/trips/as-written/packing');
  });

  test('shows counts that exist, hides zero, and names what each count means', async () => {
    counts.value = { ideas: { count: 4, waiting: false }, research: 0 };
    await mount();
    expect(row('ideas')?.textContent).toBe('Ideas4');
    expect(row('polls')?.textContent).toBe('Polls');
    expect(row('research')?.textContent).toBe('Research');
    await expect.element(link('ideas')).toHaveAttribute('aria-label', 'Ideas, 4 open');
    await expect.element(link('plan')).not.toHaveAttribute('aria-label');
  });

  test('Issues says when its count is what waits on you', async () => {
    counts.value = { issues: { count: 2, waiting: true } };
    await mount();
    await expect.element(link('issues')).toHaveAttribute('aria-label', 'Issues, 2 waiting on you');
  });

  test('research counts unread threads', async () => {
    counts.value = { research: 2 };
    await mount();
    await expect.element(link('research')).toHaveAttribute('aria-label', 'Research, 2 unread');
  });

  test('the section on screen is the current page, and badges stay out of the accessible tree', async () => {
    counts.value = { ideas: { count: 4, waiting: false } };
    await mount('plan');
    await expect.element(link('plan')).toHaveAttribute('aria-current', 'page');
    await expect.element(link('ideas')).not.toHaveAttribute('aria-current');
    const badge = row('ideas')?.querySelector('[data-slot="sidebar-menu-badge"]');
    expect(badge?.getAttribute('aria-hidden')).toBe('true');
  });

  test('only a count of what waits on you is a filled primary pill', async () => {
    counts.value = {
      issues: { count: 2, waiting: true },
      polls: { count: 1, waiting: false },
      research: 3
    };
    await mount();
    const tint = (section: string) =>
      row(section)?.querySelector('[data-slot="sidebar-menu-badge"]')?.className ?? '';
    for (const token of ['bg-primary', 'text-primary-foreground', 'rounded-full', 'px-2']) {
      expect(tint('issues').split(' ')).toContain(token);
    }
    expect(tint('issues')).toContain('tabular-nums');
    for (const section of ['polls', 'research']) {
      expect(tint(section).split(' ')).not.toContain('bg-primary');
      expect(tint(section)).toContain('text-sidebar-foreground/60');
    }
  });

  test('polls count what is waiting on your vote', async () => {
    counts.value = { polls: { count: 3, waiting: true } };
    await mount();
    await expect.element(link('polls')).toHaveAttribute('aria-label', 'Polls, 3 waiting on you');
  });

  test('marks only the section on screen active', async () => {
    await mount('issues');
    await expect.element(link('issues')).toHaveAttribute('data-active', 'true');
    await expect.element(link('research')).not.toHaveAttribute('data-active', 'true');
  });
});
