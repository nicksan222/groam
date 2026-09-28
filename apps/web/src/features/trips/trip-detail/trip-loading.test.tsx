import { PageCrumbNav } from '@groam/ui/components/page-crumb-nav';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { TripOverview } from '@/features/trips/trip-overview/trip-overview';
import { TripPageHero } from './trip-page-hero';
import { TripPageShell } from './trip-page-shell';
import { TripSectionNav } from './trip-section-nav';

afterEach(cleanup);

test('trip notice sits below the header and tab navigation', () => {
  const { container } = render(
    <TripPageShell
      banner={<div data-testid="trip-notice">Notice</div>}
      body={<div>Trip content</div>}
      crumb={<div>All trips</div>}
      hero={<div>Trip title</div>}
      nav={<div>Trip sections</div>}
    />
  );

  const content = container.querySelector('[data-slot="shell-content"]');
  const header = content?.querySelector('header');
  const notice = screen.getByTestId('trip-notice');
  expect(header?.contains(notice)).toBe(false);
  expect(notice.previousElementSibling?.textContent).toBe('Trip sections');
});

test('trip page uses one shared loading surface without rendering its unknown content', () => {
  const { container } = render(
    <TripPageShell
      body={<TripOverview isLoading />}
      crumb={
        <PageCrumbNav isLoading inset={false} parent={{ href: '/trips', label: 'All trips' }} />
      }
      hero={<TripPageHero isLoading />}
      isLoading
      nav={<TripSectionNav isLoading />}
    />
  );

  expect(screen.getByRole('status', { name: 'Loading trip…' })).toBeTruthy();
  expect(container.querySelectorAll('[data-slot="page-loading"]')).toHaveLength(1);
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  expect(screen.queryByRole('navigation', { name: 'Trip sections' })).toBeNull();
});
