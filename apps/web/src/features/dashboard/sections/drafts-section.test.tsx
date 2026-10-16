import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { DraftsSection } from './drafts-section';

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

describe('DraftsSection', () => {
  test('shows the empty state without drafts', async () => {
    await render(<DraftsSection items={[]} />);
    await expect.element(page.getByRole('heading', { name: 'Your ideas' })).toBeVisible();
    await expect.element(page.getByText('No ideas in progress')).toBeVisible();
    expect(page.getByRole('link').elements().length).toBe(0);
  });

  test.each([
    ['draft', 'Continue draft'],
    ['conflicted', 'Resolve changes']
  ] as const)('a %s idea offers "%s"', async (status, action) => {
    await render(<DraftsSection items={[makeProposal({ status })]} />);
    await expect.element(page.getByText(action)).toBeVisible();
    await expect.element(page.getByText('No ideas in progress')).not.toBeInTheDocument();
  });

  test('lists each draft with title, trip and link', async () => {
    await render(
      <DraftsSection
        items={[
          makeProposal({ id: 'p1', title: 'Rainy-day option' }),
          makeProposal({
            id: 'p2',
            sourceTripId: 'trip-2',
            sourceTripName: 'Porto',
            title: 'Wine tour'
          })
        ]}
      />
    );
    await expect.element(page.getByText('Rainy-day option')).toBeVisible();
    await expect.element(page.getByText(/Porto · /u)).toBeVisible();
    expect(page.getByRole('link').elements().length).toBe(2);
    await expect
      .element(page.getByRole('link', { name: /Wine tour/u }))
      .toHaveAttribute('href', expect.stringContaining('/trips/trip-2/ideas/p2/'));
  });
});
