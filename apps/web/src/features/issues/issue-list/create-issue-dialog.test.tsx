import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { CreateIssueDialog } from './create-issue-dialog';

const create = vi.hoisted(() => vi.fn());
vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({ useCreateIssue: () => create }));

const tripId = 'trip-1' as Id<'trips'>;
const issueId = 'issue-1' as Id<'tripIssues'>;

async function fillAndSubmit(doneWhen?: string) {
  await page.getByTestId(testIds.createIssueTitle).fill('Book flights');
  await page.getByTestId(testIds.createIssueBody).fill('We need to book them.');
  if (doneWhen) await page.getByTestId(testIds.createIssueDoneWhen).fill(doneWhen);
  await page.getByRole('button', { name: 'Create issue' }).click();
}

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue(issueId);
});

describe('CreateIssueDialog', () => {
  test('offers an optional Done when field and sends it', async () => {
    const onCreated = vi.fn();
    await render(
      <CreateIssueDialog onClose={vi.fn()} onCreated={onCreated} open tripId={tripId} />
    );
    await expect
      .element(page.getByPlaceholder('Everyone has confirmed their flights'))
      .toBeInTheDocument();

    await fillAndSubmit('  Everyone has confirmed their flights ');
    expect(create).toHaveBeenCalledWith(
      tripId,
      'Book flights',
      'We need to book them.',
      'Everyone has confirmed their flights'
    );
    expect(onCreated).toHaveBeenCalledWith(issueId);
  });

  test('leaves the condition out when the field is empty', async () => {
    await render(<CreateIssueDialog onClose={vi.fn()} onCreated={vi.fn()} open tripId={tripId} />);
    await fillAndSubmit();
    expect(create).toHaveBeenCalledWith(tripId, 'Book flights', 'We need to book them.', undefined);
  });
});
