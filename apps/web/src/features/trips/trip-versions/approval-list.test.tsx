import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ApprovalList } from './approval-list';
import type { ProposalDetail } from './proposal-types';

const approvals = (names: string[]) =>
  names.map((name, index) => ({
    name,
    userId: `user-${index}`
  })) as unknown as ProposalDetail['approvals'];

describe('ApprovalList', () => {
  test('renders nothing without approvals', async () => {
    await render(<ApprovalList approvals={approvals([])} />);
    await expect.element(page.getByText('Approved by')).not.toBeInTheDocument();
  });

  test.each([[['Ada Lovelace']], [['Ada Lovelace', 'Grace Hopper', 'Alan Turing']]])(
    'lists every approver %j',
    async (names) => {
      await render(<ApprovalList approvals={approvals(names)} />);
      await expect.element(page.getByText('Approved by')).toBeVisible();
      for (const name of names)
        await expect.element(page.getByText(name, { exact: false })).toBeVisible();
    }
  );
});
