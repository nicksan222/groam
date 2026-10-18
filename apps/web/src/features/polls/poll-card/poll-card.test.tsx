import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { Poll } from '@/types/polls';
import { PollCard } from './poll-card';

const poll = (overrides: Partial<Poll> = {}): Poll =>
  ({
    canClose: true,
    canVote: true,
    closedAt: null,
    closesAt: null,
    createdAt: 1,
    createdBy: { kind: 'agent', name: 'Groam' },
    discussionId: null,
    eligibleCount: 5,
    id: 'poll-1',
    multiSelect: false,
    myOptionIds: [],
    question: 'Dinner Friday',
    status: 'open',
    tallies: [
      { count: 2, id: 'o1', label: 'Sushi' },
      { count: 1, id: 'o2', label: 'Tapas' }
    ],
    tripId: null,
    votedCount: 3,
    voters: [
      { name: 'Ana', userId: 'u1' },
      { name: 'Ben', userId: 'u2' },
      { name: 'Cy', userId: 'u3' }
    ],
    ...overrides
  }) as Poll;

const noop = () => vi.fn().mockResolvedValue(true);

test('an open poll shows progress, tallies, voters, and votes on click', async () => {
  const onVote = noop();
  await render(<PollCard onClose={noop()} onRetract={noop()} onVote={onVote} poll={poll()} />);
  await expect.element(page.getByText('Dinner Friday')).toBeVisible();
  await expect.element(page.getByText('3 of 5 voted')).toBeVisible();
  await expect.element(page.getByText('Asked by Groam')).toBeVisible();
  await expect.element(page.getByText('Ana, Ben, Cy')).toBeVisible();
  await page.getByRole('radio', { name: /Sushi/ }).click();
  expect(onVote).toHaveBeenCalledWith(['o1']);
});

test('changing a single-select vote replaces it; retract clears it; close closes', async () => {
  const onVote = noop();
  const onRetract = noop();
  const onClose = noop();
  await render(
    <PollCard
      onClose={onClose}
      onRetract={onRetract}
      onVote={onVote}
      poll={poll({ myOptionIds: ['o1'] })}
    />
  );
  await expect.element(page.getByRole('radio', { name: /Sushi/ })).toBeChecked();
  await page.getByRole('radio', { name: /Tapas/ }).click();
  expect(onVote).toHaveBeenCalledWith(['o2']);
  await page.getByTestId(testIds.pollRetract).click();
  expect(onRetract).toHaveBeenCalledOnce();
  await page.getByTestId(testIds.pollClose).click();
  expect(onClose).toHaveBeenCalledOnce();
});

test('multi-select toggles options independently and unticking the last retracts', async () => {
  const onVote = noop();
  const onRetract = noop();
  await render(
    <PollCard
      onClose={noop()}
      onRetract={onRetract}
      onVote={onVote}
      poll={poll({ multiSelect: true, myOptionIds: ['o1'] })}
    />
  );
  await page.getByRole('checkbox', { name: /Tapas/ }).click();
  expect(onVote).toHaveBeenCalledWith(['o1', 'o2']);
  await page.getByRole('checkbox', { name: /Sushi/ }).click();
  expect(onRetract).toHaveBeenCalledOnce();
});

test('a closed poll is read-only and says so', async () => {
  await render(
    <PollCard
      onClose={noop()}
      onRetract={noop()}
      onVote={noop()}
      poll={poll({ canClose: false, canVote: false, status: 'closed', voters: [], votedCount: 0 })}
    />
  );
  await expect.element(page.getByText('Closed')).toBeVisible();
  await expect.element(page.getByRole('radio', { name: /Sushi/ })).toBeDisabled();
  expect(page.getByTestId(testIds.pollClose).elements()).toHaveLength(0);
  expect(page.getByTestId(testIds.pollRetract).elements()).toHaveLength(0);
});

test('quick multi-select clicks keep every choice while votes are in flight', async () => {
  const onVote = vi.fn().mockReturnValue(new Promise(() => undefined));
  await render(
    <PollCard
      onClose={noop()}
      onRetract={noop()}
      onVote={onVote}
      poll={poll({ multiSelect: true })}
    />
  );
  await page.getByRole('checkbox', { name: /Sushi/ }).click();
  await page.getByRole('checkbox', { name: /Tapas/ }).click();
  expect(onVote).toHaveBeenLastCalledWith(['o1', 'o2']);
  await expect.element(page.getByRole('checkbox', { name: /Sushi/ })).toBeChecked();
  await expect
    .element(page.getByRole('group', { name: 'Dinner Friday' }))
    .toHaveAttribute('aria-busy', 'true');
});

test('an open poll explains why the viewer cannot vote and when it closes', async () => {
  await render(
    <PollCard
      onClose={noop()}
      onRetract={noop()}
      onVote={noop()}
      poll={poll({
        canVote: false,
        closesAt: Date.UTC(2026, 9, 20, 18),
        tripId: 't1' as Poll['tripId']
      })}
    />
  );
  await expect.element(page.getByText('Only travelers going or maybe can vote.')).toBeVisible();
  await expect.element(page.getByText(/^Closes /)).toBeVisible();
  await expect.element(page.getByText('3 of 5 voted')).toBeVisible();
});
