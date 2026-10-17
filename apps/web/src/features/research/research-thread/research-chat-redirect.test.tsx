import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ResearchChatRedirect } from './research-chat-redirect';

const state = vi.hoisted(() => ({ target: null as null | { researchId: string; tripId: string } }));

vi.mock('@/features/research/hooks/use-research-chat-redirect', () => ({
  useResearchChatRedirect: () => state.target
}));
vi.mock('@tanstack/react-router', () => ({
  Navigate: ({ params, to }: { params: Record<string, string>; to: string }) => (
    <div data-testid="redirect">{`${to} ${JSON.stringify(params)}`}</div>
  )
}));

beforeEach(() => {
  state.target = null;
});

test('renders the chat for a group discussion', async () => {
  await render(<ResearchChatRedirect discussionId="d1">chat</ResearchChatRedirect>);
  await expect.element(page.getByText('chat')).toBeVisible();
});

test('redirects a research id to its trip page', async () => {
  state.target = { researchId: 'rs1', tripId: 't1' };
  await render(<ResearchChatRedirect discussionId="d1">chat</ResearchChatRedirect>);
  await expect
    .element(page.getByTestId('redirect'))
    .toHaveTextContent('/trips/$tripId/research/$researchId {"researchId":"rs1","tripId":"t1"}');
});
