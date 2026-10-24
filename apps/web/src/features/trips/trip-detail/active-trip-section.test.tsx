import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripTabSection } from '@/features/trips/trip-sections';
import { ActiveTripSection } from './active-trip-section';

vi.mock('@/features/trip-queue/queue-panel', () => ({
  QueuePanel: ({ kind }: { kind: string }) => <p>{kind} queue</p>
}));
vi.mock('@/features/trips/trip-packing/trip-packing-panel', () => ({
  TripPackingPanel: () => <p>packing panel</p>
}));
vi.mock('@/features/trips/trip-plan/trip-plan-panel', () => ({
  TripPlanPanel: ({ day }: { day?: number }) => <p>plan panel{day ? ` on day ${day}` : ''}</p>
}));
vi.mock('@/features/research/research-list/trip-research-section', () => ({
  TripResearchSection: () => <p>research list</p>
}));
vi.mock('./trip-history-page', () => ({ TripHistoryPage: () => <p>history page</p> }));
vi.mock('./trip-calendar-page', () => ({
  TripCalendarPage: ({ day, fill }: { day?: number; fill?: boolean }) => (
    <p>
      calendar page{fill ? ' (fill)' : ''}
      {day ? ` on day ${day}` : ''}
    </p>
  )
}));

const trip = { archivedAt: null, id: 'trip-1', name: 'Atlantic week' } as unknown as TripDetail;

function renderSection(section: TripTabSection, day?: number) {
  return render(<ActiveTripSection day={day} section={section} trip={trip} />);
}

describe('ActiveTripSection', () => {
  test.each([
    ['activity', 'history page'],
    ['calendar', 'calendar page (fill)'],
    ['ideas', 'idea queue'],
    ['issues', 'issue queue'],
    ['packing', 'packing panel'],
    ['plan', 'plan panel'],
    ['polls', 'poll queue'],
    ['research', 'research list']
  ] as const)('%s renders the %s', async (section, text) => {
    await renderSection(section);
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test.each([
    ['plan', 'plan panel on day 3'],
    ['calendar', 'calendar page (fill) on day 3']
  ] as const)('hands %s the requested day', async (section, text) => {
    await renderSection(section, 3);
    await expect.element(page.getByText(text)).toBeVisible();
  });
});
