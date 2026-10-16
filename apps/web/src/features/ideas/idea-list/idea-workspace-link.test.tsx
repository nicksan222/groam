import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { IdeaHrefProposal } from '@/types/ideas';
import { IdeaWorkspaceLink } from './idea-workspace-link';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    onClick,
    params = {},
    search,
    title,
    to
  }: {
    children?: ReactNode;
    onClick?: () => void;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    title?: string;
    to: string;
  }) => (
    <a
      href={
        Object.entries(params).reduce((href, [key, value]) => href.replace(`$${key}`, value), to) +
        (search && Object.keys(search).length > 0
          ? `?${new URLSearchParams(search as Record<string, string>)}`
          : '')
      }
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
      title={title}
    >
      {children}
    </a>
  )
}));

const proposal = (overrides: Partial<IdeaHrefProposal>): IdeaHrefProposal => ({
  id: 'idea-1' as Id<'tripProposals'>,
  sourceTripId: 'trip-1' as Id<'trips'>,
  status: 'in_review',
  ...overrides
});

describe('IdeaWorkspaceLink', () => {
  test.each<[string, IdeaHrefProposal, string]>([
    ['with a source trip', proposal({}), '/trips/trip-1/ideas/idea-1/compare'],
    ['without a source trip', proposal({ sourceTripId: undefined }), '/ideas/idea-1']
  ])('links an idea %s', async (_, idea, href) => {
    await render(<IdeaWorkspaceLink proposal={idea}>Open idea</IdeaWorkspaceLink>);
    await expect
      .element(page.getByRole('link', { name: 'Open idea' }))
      .toHaveAttribute('href', href);
  });

  test('passes the title and reports clicks', async () => {
    const onClick = vi.fn();
    await render(
      <IdeaWorkspaceLink onClick={onClick} proposal={proposal({})} title="Coast day idea">
        Open idea
      </IdeaWorkspaceLink>
    );
    const link = page.getByRole('link', { name: 'Open idea' });
    await expect.element(link).toHaveAttribute('title', 'Coast day idea');
    await link.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
