import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardLane } from '@/types/trip-board';
import { TripBoardLaneHeader } from './trip-board-lane-header';

describe('TripBoardLaneHeader', () => {
  test.each<[TripBoardLane, string, string]>([
    ['agreed', 'Agreed plan', 'What the group has settled'],
    ['review', 'Ideas', 'Drafts and proposals the group is voting on'],
    ['wont_do', "Won't do", 'Dropped on purpose']
  ])('titles the %s lane', async (lane, title, subtitle) => {
    await render(<TripBoardLaneHeader count={2} headingId="h" lane={lane} />);
    await expect.element(page.getByRole('heading', { name: title })).toHaveAttribute('id', 'h');
    await expect.element(page.getByText(subtitle)).toBeInTheDocument();
  });

  test.each<[number | undefined, string | null]>([
    [undefined, null],
    [0, '0 cards'],
    [1, '1 card'],
    [4, '4 cards']
  ])('count %s is announced as %s', async (count, announced) => {
    await render(<TripBoardLaneHeader count={count} headingId="h" lane="open" />);
    if (announced) await expect.element(page.getByText(announced)).toBeInTheDocument();
    else await expect.element(page.getByText('…')).toBeInTheDocument();
  });
});
