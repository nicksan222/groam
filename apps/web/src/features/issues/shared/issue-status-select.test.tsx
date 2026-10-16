import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ISSUE_STATUSES, issueStatusMeta } from '@/features/issues/issue-status';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition, IssueStatus } from '@/types/issues';
import { IssueStatusSelect } from './issue-status-select';

const autoCondition = (
  met = false,
  refusal = met ? 'Settled by the trip.' : 'Closes once the trip has a destination.'
) =>
  ({
    check: 'destination',
    kind: 'auto',
    label: 'The trip has a destination',
    met,
    refusal
  }) satisfies IssueCondition;

const manualCondition = (label = 'Flights confirmed') =>
  ({ kind: 'manual', label, met: null }) satisfies IssueCondition;

const unmet = autoCondition(false, 'Closes once the trip has a destination.');
const met = autoCondition(true, 'Settled by the trip.');

const option = (status: IssueStatus) =>
  page
    .getByTestId(testIds.issueStatusSelectOption)
    .filter({ hasText: issueStatusMeta[status].label });

describe('IssueStatusSelect', () => {
  test('reports the chosen status', async () => {
    const onChange = vi.fn();
    await render(<IssueStatusSelect canManage onChange={onChange} status="open" />);

    await page.getByRole('combobox', { name: 'Issue status' }).click();
    await option('in_progress').click();
    expect(onChange).toHaveBeenCalledWith('in_progress');
  });

  test('falls back to a plain badge without manage rights', async () => {
    await render(<IssueStatusSelect canManage={false} onChange={vi.fn()} status="wont_do" />);
    await expect.element(page.getByTestId(testIds.issueStatus)).toHaveTextContent("Won't do");
    await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
  });

  test('cannot be opened while disabled', async () => {
    await render(<IssueStatusSelect canManage disabled onChange={vi.fn()} status="open" />);
    await expect.element(page.getByRole('combobox', { name: 'Issue status' })).toBeDisabled();
  });

  const cases = [
    {
      condition: unmet,
      disabled: ['closed', 'wont_do'],
      name: 'unmet auto condition',
      status: 'open'
    },
    {
      condition: met,
      disabled: ['open', 'in_progress', 'wont_do'],
      name: 'met auto condition',
      status: 'closed'
    },
    { condition: manualCondition(), disabled: [], name: 'manual condition', status: 'open' },
    { condition: null, disabled: [], name: 'no condition', status: 'open' }
  ] satisfies Array<{
    condition: IssueCondition | null;
    disabled: IssueStatus[];
    name: string;
    status: IssueStatus;
  }>;

  test.each(cases)('$name', async ({ condition, disabled, status }) => {
    await render(
      <IssueStatusSelect canManage condition={condition} onChange={vi.fn()} status={status} />
    );
    await page.getByRole('combobox', { name: 'Issue status' }).click();
    for (const candidate of ISSUE_STATUSES) {
      const row = option(candidate);
      if (disabled.some((status) => status === candidate)) {
        await expect.element(row).toHaveAttribute('aria-disabled', 'true');
        expect(row.element().textContent).toContain(
          condition?.kind === 'auto' ? condition.refusal : ''
        );
      } else {
        await expect.element(row).not.toHaveAttribute('aria-disabled');
      }
    }
  });
});
