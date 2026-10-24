import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { IdeaStatus } from '@/types/ideas';
import { IdeaHeaderStatus } from './idea-header-status';

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ({ proposal: { conflicts: [] } })
}));

test.each([
  ['draft', 'Draft'],
  ['merged', 'Applied']
] as const)('shows the %s state as a chip', async (status: IdeaStatus, label) => {
  await render(<IdeaHeaderStatus status={status} />);
  await expect.element(page.getByTestId('idea-status-badge')).toHaveTextContent(label);
});
