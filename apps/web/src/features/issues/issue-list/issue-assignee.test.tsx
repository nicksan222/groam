import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { IssueCardData } from '@/types/issues';
import { IssueAssignee } from './issue-assignee';

describe('IssueAssignee', () => {
  test('names a person with initials', async () => {
    const assignee: IssueCardData['assignee'] = {
      kind: 'user',
      name: 'Sam Planner',
      userId: 'user-sam'
    };
    await render(<IssueAssignee assignee={assignee} />);
    await expect.element(page.getByText('Sam Planner')).toBeVisible();
    await expect.element(page.getByText('SP')).toBeInTheDocument();
  });

  test('says Unassigned without an assignee', async () => {
    await render(<IssueAssignee assignee={null} />);
    await expect.element(page.getByText('Unassigned')).toBeVisible();
  });
});
