import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  WorkspaceContext,
  type WorkspaceContextValue
} from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { IssueAssigneePicker } from './issue-assignee-picker';

const workspace = {
  activeOrganization: {
    members: [
      { user: { name: 'Lea Demo' }, userId: 'user-lea' },
      { user: { name: 'Sam Planner' }, userId: 'user-sam' }
    ]
  },
  session: { user: { id: 'user-lea', name: 'Lea Demo' } }
} as unknown as WorkspaceContextValue;

function Controlled({ onAssign }: { onAssign: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        External open
      </button>
      <IssueAssigneePicker assignee={null} onAssign={onAssign} onOpenChange={setOpen} open={open}>
        <button type="button">Trigger</button>
      </IssueAssigneePicker>
    </>
  );
}

describe('IssueAssigneePicker', () => {
  test('suggests me first, then the Issue agent, then teammates, and closes after assigning', async () => {
    const onAssign = vi.fn();
    await render(
      <WorkspaceContext.Provider value={workspace}>
        <IssueAssigneePicker assignee={null} onAssign={onAssign}>
          <button type="button">Trigger</button>
        </IssueAssigneePicker>
      </WorkspaceContext.Provider>
    );
    await page.getByRole('button', { name: 'Trigger' }).click();

    const rows = page
      .getByTestId(testIds.issueAssigneePicker)
      .getByRole('button')
      .all()
      .map((row) => row.element().getAttribute('aria-label'));
    expect(rows).toEqual(['Assign me', 'Assign Issue agent', 'Assign Sam Planner']);

    await page.getByRole('button', { name: 'Assign me' }).click();
    expect(onAssign).toHaveBeenCalledWith({ kind: 'user', name: 'Lea Demo', userId: 'user-lea' });
    await expect.element(page.getByTestId(testIds.issueAssigneePicker)).not.toBeInTheDocument();
  });

  test('unassigns when the current assignee is chosen again', async () => {
    const onAssign = vi.fn();
    await render(
      <WorkspaceContext.Provider value={workspace}>
        <IssueAssigneePicker
          assignee={{ kind: 'user', name: 'Sam Planner', userId: 'user-sam' }}
          onAssign={onAssign}
        >
          <button type="button">Trigger</button>
        </IssueAssigneePicker>
      </WorkspaceContext.Provider>
    );
    await page.getByRole('button', { name: 'Trigger' }).click();
    await page.getByRole('button', { name: 'Unassign Sam Planner' }).click();
    expect(onAssign).toHaveBeenCalledWith(null);
  });

  test('can be opened programmatically', async () => {
    await render(
      <WorkspaceContext.Provider value={workspace}>
        <Controlled onAssign={vi.fn()} />
      </WorkspaceContext.Provider>
    );
    await expect.element(page.getByTestId(testIds.issueAssigneePicker)).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'External open' }).click();
    await expect.element(page.getByTestId(testIds.issueAssigneePicker)).toBeInTheDocument();
  });
});
