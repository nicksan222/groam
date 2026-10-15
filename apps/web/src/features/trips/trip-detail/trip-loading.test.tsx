import { PageCrumbNav } from '@groam/ui/components/page-crumb-nav';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripOverview } from '@/features/trips/trip-overview/trip-overview';
import { TripPageHero } from './trip-page-hero';
import { TripPageShell } from './trip-page-shell';
import { TripSectionNav } from './trip-section-nav';

test('trip notice sits below the header and tab navigation', async () => {
  const { container } = await render(
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
  const notice = page.getByTestId('trip-notice').element();
  expect(header?.contains(notice)).toBe(false);
  expect(notice.previousElementSibling?.textContent).toBe('Trip sections');
});

test('trip page uses one shared loading surface without rendering its unknown content', async () => {
  const { container } = await render(
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

  await expect.element(page.getByRole('status', { name: 'Loading trip…' })).toBeInTheDocument();
  expect(container.querySelectorAll('[data-slot="page-loading"]')).toHaveLength(1);
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  await expect
    .element(page.getByRole('navigation', { name: 'Trip sections' }))
    .not.toBeInTheDocument();
});
