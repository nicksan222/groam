import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { IssueCardData } from '@/types/issues';
import { IssueAssigneeAvatar } from './issue-assignee-avatar';

const person: IssueCardData['assignee'] = { kind: 'user', name: 'Sam Planner', userId: 'user-sam' };
const agent = {
  agentId: 'issue-agent',
  kind: 'agent',
  name: 'Issue agent'
} as unknown as IssueCardData['assignee'];

describe('IssueAssigneeAvatar', () => {
  test('shows initials for a person', async () => {
    await render(<IssueAssigneeAvatar assignee={person} />);
    await expect.element(page.getByText('SP')).toBeVisible();
  });

  test.each<[string, IssueCardData['assignee'], string]>([
    ['a person', person, 'Sam Planner'],
    ['an agent', agent, 'Issue agent'],
    ['no one', null, 'Unassigned']
  ])('is an image named after %s when labelled', async (_, assignee, name) => {
    await render(<IssueAssigneeAvatar assignee={assignee} labelled />);
    await expect.element(page.getByRole('img', { name })).toBeVisible();
  });

  test.each<[string, IssueCardData['assignee']]>([
    ['agent', agent],
    ['unassigned', null]
  ])('shows an icon, not initials, for %s', async (_, assignee) => {
    const { container } = await render(<IssueAssigneeAvatar assignee={assignee} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.textContent).toBe('');
  });

  test('has no image role when not labelled', async () => {
    await render(<IssueAssigneeAvatar assignee={null} />);
    await expect.element(page.getByRole('img')).not.toBeInTheDocument();
  });
});
