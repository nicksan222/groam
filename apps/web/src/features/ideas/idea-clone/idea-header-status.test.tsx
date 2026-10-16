import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { IdeaStatus } from '@/types/ideas';
import { IdeaHeaderStatus } from './idea-header-status';

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ({ proposal: { conflicts: [] } })
}));

test.each([
  [true, false, 'draft', 'Editing idea'],
  [false, false, 'draft', 'Viewing idea · Read-only'],
  [false, false, 'merged', 'Viewing idea · Read-only'],
  [true, true, 'draft', 'Reviewing changes']
] as const)(
  'labels permissions and review mode: %s %s %s',
  async (canEdit, reviewing, status: IdeaStatus, label) => {
    await render(
      <IdeaHeaderStatus
        canEdit={canEdit}
        reviewing={reviewing}
        sharedTripName="Portugal week"
        status={status}
      />
    );
    await expect.element(page.getByText(label)).toBeInTheDocument();
    await expect.element(page.getByTestId('idea-status-badge')).toBeInTheDocument();
    await expect.element(page.getByText('An idea for Portugal week')).toBeInTheDocument();
  }
);
