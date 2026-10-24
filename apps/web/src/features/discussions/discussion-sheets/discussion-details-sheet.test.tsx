import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { testIds } from '@/lib/test-ids';
import { DiscussionDetailsSheet } from './discussion-details-sheet';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params,
    to
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    to: string;
  }) => (
    <a
      href={to.replace('$tripId', params?.tripId ?? '').replace('$section', params?.section ?? '')}
    >
      {children}
    </a>
  )
}));

function makeDiscussion(overrides: Partial<DiscussionListItem> = {}): DiscussionListItem {
  return {
    createdBy: { name: 'Ada Lovelace', userId: 'user-a' },
    id: 'discussion-1',
    members: [
      { image: null, name: 'Ada Lovelace', userId: 'user-a' },
      { image: null, name: 'Grace Hopper', userId: 'user-g' }
    ],
    title: 'Italy dates',
    tripId: 'trip-1',
    tripName: 'Rome weekend',
    updatedAt: Date.UTC(2020, 0, 1),
    ...overrides
  } as unknown as DiscussionListItem;
}

describe('DiscussionDetailsSheet', () => {
  test('summarises the chat and links its trip', async () => {
    await render(
      <DiscussionDetailsSheet discussion={makeDiscussion()} onOpenChange={vi.fn()} open />
    );
    await expect.element(page.getByText('Chat details')).toBeVisible();
    await expect.element(page.getByText('Italy dates')).toBeVisible();
    await expect.element(page.getByText('Ada Lovelace, Grace Hopper')).toBeVisible();
    await expect.element(page.getByText('Started by')).toBeVisible();
    await expect.element(page.getByText('2 people')).toBeVisible();
    await expect.element(page.getByText('Last activity')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Rome weekend' }))
      .toHaveAttribute('href', '/trips/trip-1/plan');
  });

  test('uses the singular people label for a solo chat', async () => {
    await render(
      <DiscussionDetailsSheet
        discussion={makeDiscussion({
          members: [{ image: null, name: 'Ada Lovelace', userId: 'user-a' }]
        } as Partial<DiscussionListItem>)}
        onOpenChange={vi.fn()}
        open
      />
    );
    await expect.element(page.getByText('1 person')).toBeVisible();
  });

  test.each([
    ['no trip', { tripId: undefined, tripName: null }],
    ['a trip name without an id', { tripId: undefined }]
  ])('omits the linked trip with %s', async (_, overrides) => {
    await render(
      <DiscussionDetailsSheet
        discussion={makeDiscussion(overrides as Partial<DiscussionListItem>)}
        onOpenChange={vi.fn()}
        open
      />
    );
    await expect.element(page.getByText('Linked trip')).not.toBeInTheDocument();
  });

  test('renders nothing while closed', async () => {
    await render(
      <DiscussionDetailsSheet discussion={makeDiscussion()} onOpenChange={vi.fn()} open={false} />
    );
    await expect.element(page.getByTestId(testIds.chatDetails)).not.toBeInTheDocument();
  });

  test('asks to close from the close control', async () => {
    const onOpenChange = vi.fn();
    await render(
      <DiscussionDetailsSheet discussion={makeDiscussion()} onOpenChange={onOpenChange} open />
    );
    await page.getByRole('button', { name: 'Close' }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
