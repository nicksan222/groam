import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { WaitingSection } from './waiting-section';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const navigate = vi.fn();
  return {
    ...(await importOriginal<typeof import('@tanstack/react-router')>()),
    Link: ({
      children,
      className,
      params,
      to
    }: {
      children?: ReactNode;
      className?: string;
      params?: Record<string, string>;
      to: string;
    }) => {
      let href = to;
      for (const [key, value] of Object.entries(params ?? {})) {
        href = href.replace(`$${key}`, value);
      }
      return (
        <a className={className} href={href} onClick={(event) => event.preventDefault()}>
          {children}
        </a>
      );
    },
    useNavigate: () => navigate
  };
});

function makeProposal(overrides: Record<string, unknown> = {}): WorkspaceTripProposal {
  return {
    author: { name: 'Lea', userId: 'user-1' },
    id: 'p1',
    reviewRequested: false,
    sourceTripId: 'trip-1',
    sourceTripName: 'Lisbon',
    status: 'draft',
    title: 'Add a rainy-day option',
    updatedAt: Date.now() - 2 * 86_400_000,
    ...overrides
  } as unknown as WorkspaceTripProposal;
}

describe('WaitingSection', () => {
  test('shows the heading and a card per idea', async () => {
    await render(
      <WaitingSection
        items={[
          makeProposal({ id: 'p1', title: 'Rainy-day option' }),
          makeProposal({ author: { name: 'Sam', userId: 'u2' }, id: 'p2', title: 'Add Porto' })
        ]}
      />
    );
    await expect.element(page.getByRole('heading', { name: 'Needs your attention' })).toBeVisible();
    await expect.element(page.getByRole('article').first()).toBeVisible();
    expect(page.getByRole('article').elements().length).toBe(2);
    await expect.element(page.getByText('Requested by Lea')).toBeVisible();
    await expect.element(page.getByText('Requested by Sam')).toBeVisible();
  });

  test('each card links to its idea from the title and the review button', async () => {
    await render(<WaitingSection items={[makeProposal({ title: 'Rainy-day option' })]} />);
    await expect
      .element(page.getByRole('link', { name: 'Rainy-day option' }))
      .toHaveAttribute('href', expect.stringContaining('/trips/trip-1/ideas/p1/'));
    await expect
      .element(page.getByRole('link', { name: 'Review idea' }))
      .toHaveAttribute('href', expect.stringContaining('/trips/trip-1/ideas/p1/'));
  });

  test('shows the trip name and a relative date', async () => {
    await render(<WaitingSection items={[makeProposal()]} />);
    await expect.element(page.getByText(/Lisbon · 2 days ago/u)).toBeVisible();
  });

  test('renders no cards for an empty list', async () => {
    await render(<WaitingSection items={[]} />);
    expect(page.getByRole('article').elements().length).toBe(0);
  });
});
